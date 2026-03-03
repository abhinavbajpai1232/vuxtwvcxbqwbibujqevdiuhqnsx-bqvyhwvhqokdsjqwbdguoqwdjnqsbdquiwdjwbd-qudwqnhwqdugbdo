import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import * as pty from 'node-pty';
import os from 'os';
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// --- 1. TERMINAL LOGIC (The Power Bridge) ---
io.on("connection", (socket) => {
  console.log("[+] User Connected to Command Center");

  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as any
  });

  ptyProcess.onData((data) => socket.emit("terminal-output", data));
  socket.on("terminal-input", (data) => ptyProcess.write(data));

  // --- 2. SNIFFER/SCANNER LOGIC (Backwards Compatibility) ---
  let snifferProcess: any = null;

  socket.on("start-sniffing", () => {
    if (snifferProcess) return;
    snifferProcess = spawn("python", ["sniffer.py"]);
    
    snifferProcess.stdout.on("data", (data: any) => {
       const output = data.toString();
       // Parse sniffer output to frontend table
       if (output.startsWith("PACKET|")) {
         socket.emit("new-packet", output); 
       }
    });
  });

  socket.on("stop-sniffing", () => {
    if (snifferProcess) {
      snifferProcess.kill();
      snifferProcess = null;
    }
  });

  socket.on("disconnect", () => {
    ptyProcess.kill();
    if (snifferProcess) snifferProcess.kill();
  });
});

// --- 3. API ROUTES ---
app.post("/api/scan", (req, res) => {
  const { target } = req.body;
  // Terminal se bhi scan ho sakta hai, par UI button ke liye ye zaroori hai
  console.log(`[!] API Scan Triggered for: ${target}`);
  res.json({ status: "Scan Started in Background" });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 PREDATOR SERVER LIVE: http://localhost:${PORT}`);
});