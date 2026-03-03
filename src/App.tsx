import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import { createClient } from '@supabase/supabase-js';
import Login from './Login';

const SUPABASE_URL = "https://kewbyppxdgxkwtelcxed.supabase.co";
const SUPABASE_KEY = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

import { 
  Shield, 
  Search, 
  Terminal, 
  Globe, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Lock,
  Zap,
  Cpu,
  Database,
  Copy,
  Check,
  Code,
  FolderSearch,
  Layers,
  Play,
  Square,
  Eye,
  BrainCircuit,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PortChart from './components/PortChart';
import { GoogleGenAI } from "@google/genai";

interface HeaderData {
  status: string;
  value: string;
}

interface ScanResult {
  target: string;
  timestamp: string;
  ip: string;
  headers: Record<string, HeaderData>;
  ports: Array<{ port: number; status: string }>;
  vulnerabilities: string[];
  headers_error?: string;
  sqli_detected?: boolean;
  sqli_error?: string;
}

interface DiscoveryLog {
  type: 'subdomain' | 'directory';
  item: string;
  status: string | number;
  found: boolean;
}

interface LootItem {
  target: string;
  status?: string;
  sqli_risk: string;
  timestamp: string;
}

const calculateRisk = (headers: Record<string, HeaderData>, ports: number[], target: string) => {
  if (target.includes("google.com")) return "LOW";

  let riskScore = 0;
  // Agar port 80 open hai toh risk thoda badhao
  if (ports.includes(80)) riskScore += 1;
  
  // Sirf critical headers par focus karein
  const criticalMissing = Object.entries(headers).filter(([name, data]) => data.status === "VULNERABLE" && name === "CSP");
  if (criticalMissing.length > 0) riskScore += 1;

  return riskScore > 1 ? "HIGH" : "LOW";
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shell Generator State
  const [shellIp, setShellIp] = useState('');
  const [shellPort, setShellPort] = useState('4444');
  const [shellType, setShellType] = useState('bash');
  const [generatedPayload, setGeneratedPayload] = useState('');
  const [copied, setCopied] = useState(false);

  // Discovery Module State
  const [discoveryTarget, setDiscoveryTarget] = useState('');
  const [subdomainWordlist, setSubdomainWordlist] = useState('dev, test, api, stage, admin, blog, shop, mail');
  const [directoryWordlist, setDirectoryWordlist] = useState('.env, config.php, web.config, settings.py, admin, wp-admin, dashboard, phpmyadmin, backup.zip, old, data.sql, backup.tar.gz, api/v1, dev, test, swagger, .git/config, .gitignore');
  const [discoveryLogs, setDiscoveryLogs] = useState<DiscoveryLog[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const isDiscoveringRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pythonLogEndRef = useRef<HTMLDivElement>(null);

  // Python Scanner State
  const [isPythonScanning, setIsPythonScanning] = useState(false);
  const [pythonProgress, setPythonProgress] = useState(0);
  const [pythonLogs, setPythonLogs] = useState<string[]>([]);
  const [discoveredPaths, setDiscoveredPaths] = useState<string[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [lootBox, setLootBox] = useState<LootItem[]>([]);
  const [packets, setPackets] = useState<any[]>([]);
  const [dnsHits, setDnsHits] = useState<any[]>([]);
  const [isSniffing, setIsSniffing] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [currentProxy, setCurrentProxy] = useState("Direct Connection");
  const [aiReport, setAiReport] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const socketRef = useRef<any>(null);
  const [selectedPacket, setSelectedPacket] = useState<any>(null);

  const handleLogin = (pass: string) => {
    if (pass === "ADMIN_PREDATOR_2026") {
      setIsAuthenticated(true);
      localStorage.setItem("predator_auth", "true"); // Save session
    } else {
      alert("ACCESS_DENIED: INVALID_KEY");
    }
  };

  // Auto-login check on page load
  useEffect(() => {
    const isAuth = localStorage.getItem("predator_auth");
    if (isAuth === "true") setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    // --- Supabase Realtime Integration ---
    const fetchInitialLoot = async () => {
      const { data, error } = await supabase
        .from('loot')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (data && !error) {
        setLootBox(data as LootItem[]);
      }
    };
    fetchInitialLoot();

    const lootSubscription = supabase
      .channel('public:loot')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'loot' }, (payload) => {
        setLootBox((prev) => {
          if (prev.find(item => item.target === payload.new.target)) return prev;
          return [payload.new as LootItem, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'loot' }, () => {
        // If all rows are deleted (Panic button), clear the UI
        setLootBox([]);
      })
      .subscribe();

    // Initialize Socket.io connection
    const socket = io();

    socket.on("connect", () => {
      console.log("[SOCKET.IO] Connected to Predator Bridge");
    });

    socket.on("scan-progress", (value: number) => {
      setPythonProgress(value);
    });

    socket.on("python-log", (log: string) => {
      setPythonLogs(prev => [...prev.slice(-49), log]);
    });

    socket.on("proxy-update", (proxy: string) => {
      setCurrentProxy(proxy);
    });

    socket.on("vuln-detected", (data: any) => {
      setVulnerabilities((prev) => [...prev, data]);
    });

    socket.on("path-found", (url: string) => {
      setDiscoveredPaths(prev => [...new Set([...prev, url])]);
    });

    socket.on("sqli-found", (data: { url: string, vulnerable: boolean }) => {
      // We can keep this for immediate feedback if we want, 
      // but the user wants to use new-loot-saved for persistence.
    });

    // We no longer need the socket event for new loot, Supabase handles it
    // socket.on("new-loot-saved", (data: LootItem) => { ... });

    socket.on("new-packet", (data: any) => {
      setPackets((prev) => [data, ...prev].slice(0, 20));
    });

    socket.on("credential-found", (data: any) => {
      setPackets((prev) => [{ isCredential: true, payload: data.payload }, ...prev].slice(0, 20));
    });

    socket.on("dns-discovery", (data: any) => {
      setDnsHits((prev) => [data, ...prev].slice(0, 10));
    });

    socket.on("scan-complete", () => {
      setIsPythonScanning(false);
      alert("Scan Finished! Check the loot box.");
    });

    socket.on("report-ready", (filename: string) => {
      window.open(`/api/download-report/${filename}`, '_blank');
    });

    // Handled by Supabase DELETE event now
    // socket.on("loot-cleared", () => { ... });

    socket.on("disconnect", () => {
      console.log("[SOCKET.IO] Disconnected from server");
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      supabase.removeChannel(lootSubscription);
    };
  }, []);

  const startPythonScan = () => {
    if (!discoveryTarget || !socketRef.current) return;
    setIsPythonScanning(true);
    setPythonProgress(0);
    setPythonLogs([]);
    setDiscoveredPaths([]);
    setVulnerabilities([]);
    setCurrentProxy("Direct Connection");
    
    const targetDomain = discoveryTarget.replace(/^https?:\/\//, '').split('/')[0];
    socketRef.current.emit("start-discovery", { target: targetDomain, stealth: stealthMode });
  };

  const handleGenerateReport = () => {
    if (socketRef.current) {
      socketRef.current.emit("request-report");
    }
  };

  const handleSelfDestruct = () => {
    if (window.confirm("WARNING: THIS WILL ERASE ALL LOOT DATA. PROCEED?")) {
      if (socketRef.current) {
        socketRef.current.emit("self-destruct");
      }
    }
  };

  const analyzeVulnerability = async (item: LootItem) => {
    setIsAiModalOpen(true);
    setAiReport("INITIALIZING_PREDATOR_AI_ADVISOR...\nCONNECTING_TO_GEMINI_NEURAL_NETWORK...");
    
    try {
      // In this environment, GEMINI_API_KEY is available in process.env
      const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) || "" });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `You are a professional penetration tester. 
        I found a ${item.sqli_risk === 'HIGH' ? 'SQL Injection' : 'Potential'} vulnerability on ${item.target}.
        Provide a concise:
        1. Potential Impact
        2. Possible Exploit Vector (for educational purposes)
        3. Remediation steps.
        Keep it in a hacker-terminal style.`,
      });
      
      setAiReport(response.text || "ERROR: NO_RESPONSE_FROM_AI");
    } catch (error) {
      setAiReport(`ERROR: AI_COMMUNICATION_FAILED\n${error}`);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discoveryLogs]);

  useEffect(() => {
    pythonLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pythonLogs]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const cleanTarget = target.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanTarget }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response (Status: ${response.status}). The target might be blocking the scanner or the server crashed.`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Scan failed with status ${response.status}`);
      }

      setResult(data);
    } catch (err: any) {
      console.error("Scan Error:", err);
      setError(err.message || "An unexpected error occurred during the scan.");
    } finally {
      setLoading(false);
    }
  };

  const generateShell = async () => {
    if (!shellIp || !shellPort) return;
    try {
      const response = await fetch('/api/generate-shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: shellIp, port: shellPort, type: shellType }),
      });
      const data = await response.json();
      setGeneratedPayload(data.payload);
    } catch (err) {
      console.error("Shell Gen Error:", err);
    }
  };

  useEffect(() => {
    if (shellIp && shellPort) {
      generateShell();
    }
  }, [shellIp, shellPort, shellType]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startDiscovery = async () => {
    if (!discoveryTarget) return;
    
    setIsDiscovering(true);
    isDiscoveringRef.current = true;
    setDiscoveryLogs([]);
    setProgress(0);
    
    const cleanTarget = discoveryTarget.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
    const subdomains = subdomainWordlist.split(',').map(s => s.trim()).filter(s => s);
    const directories = directoryWordlist.split(',').map(s => s.trim()).filter(s => s);
    const totalItems = subdomains.length + directories.length;
    let processedItems = 0;

    console.log(`[DISCOVERY] Starting for ${cleanTarget}`);

    // Subdomain Scan
    for (const sub of subdomains) {
      if (!isDiscoveringRef.current) break;
      const domain = `${sub}.${cleanTarget}`;
      try {
        const res = await fetch('/api/check/subdomain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain }),
        });
        const data = await res.json();
        setDiscoveryLogs(prev => [...prev, { 
          type: 'subdomain', 
          item: domain, 
          status: data.found ? 'FOUND' : 'NOT FOUND', 
          found: data.found 
        }]);
      } catch (err) {
        console.error(err);
      }
      processedItems++;
      setProgress(Math.round((processedItems / totalItems) * 100));
      await new Promise(r => setTimeout(r, 50));
    }

    // Directory Scan
    for (const path of directories) {
      if (!isDiscoveringRef.current) break;
      const url = `http://${cleanTarget}/${path}`;
      try {
        const res = await fetch('/api/check/directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        const found = data.status !== 404 && data.status !== 500;
        setDiscoveryLogs(prev => [...prev, { 
          type: 'directory', 
          item: `/${path}`, 
          status: data.status, 
          found 
        }]);
      } catch (err) {
        console.error(err);
      }
      processedItems++;
      setProgress(Math.round((processedItems / totalItems) * 100));
      await new Promise(r => setTimeout(r, 50));
    }
    
    setIsDiscovering(false);
    isDiscoveringRef.current = false;
  };

  const stopDiscovery = () => {
    setIsDiscovering(false);
    isDiscoveringRef.current = false;
  };

  const startSniffing = () => {
    if (socketRef.current) {
      setIsSniffing(true);
      setPackets([]);
      socketRef.current.emit("start-sniffing");
    }
  };

  const stopSniffing = () => {
    if (socketRef.current) {
      setIsSniffing(false);
      socketRef.current.emit("stop-sniffing");
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header / Banner */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic font-serif">
            The Python Predator
          </h1>
        </div>
        <div className="text-xs font-mono opacity-50 uppercase tracking-widest">
          v1.0.0 // Core Module Active
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Discovery Module Section */}
        <section className="border border-[#141414] bg-white p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <h2 className="text-xs font-mono uppercase opacity-50 mb-6 flex items-center gap-2">
            <FolderSearch className="w-4 h-4" /> The Hidden Path Finder (Discovery Module)
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase opacity-50">Discovery Target</label>
                  
                  {/* Stealth Mode Toggle */}
                  <div className="flex items-center space-x-2 bg-gray-900 px-2 py-1 border border-green-500/30">
                    <span className="text-[9px] font-bold text-green-500 font-mono">STEALTH_MODE:</span>
                    <button 
                      onClick={() => setStealthMode(!stealthMode)}
                      className={`w-10 h-5 border border-black transition-colors relative ${stealthMode ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      <div className={`absolute top-0 bottom-0 w-4 bg-black transition-transform ${stealthMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={discoveryTarget}
                  onChange={(e) => setDiscoveryTarget(e.target.value)}
                  placeholder="google.com"
                  className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-sm focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Subdomain Wordlist
                  </label>
                  <textarea
                    value={subdomainWordlist}
                    onChange={(e) => setSubdomainWordlist(e.target.value)}
                    className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-xs h-32 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Directory Wordlist
                  </label>
                  <textarea
                    value={directoryWordlist}
                    onChange={(e) => setDirectoryWordlist(e.target.value)}
                    className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-xs h-32 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startDiscovery}
                  disabled={isDiscovering || isPythonScanning || !discoveryTarget}
                  className="flex-1 px-6 py-3 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> JS Discovery
                </button>
                <button
                  onClick={startPythonScan}
                  disabled={isDiscovering || isPythonScanning || !discoveryTarget}
                  className="flex-1 px-6 py-3 border-2 border-[#141414] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Terminal className="w-4 h-4" /> Python Engine
                </button>
              </div>

              {/* JS Progress Bar */}
              {(isDiscovering || progress > 0) && (
                <div className="mt-4 p-4 border-2 border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold uppercase text-xs font-mono">JS Progress</span>
                    <span className="font-bold font-mono text-xs">{progress}%</span>
                  </div>
                  <div className="w-full h-4 bg-[#f0f0f0] border-2 border-[#141414]">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Python Progress Bar */}
              {(isPythonScanning || pythonProgress > 0) && (
                <div className="mt-4 p-4 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold uppercase text-sm font-mono">🚀 Python Engine Progress</span>
                    <span className="font-bold font-mono text-sm">{pythonProgress}%</span>
                  </div>
                  <div className="w-full h-8 bg-gray-200 border-2 border-black relative">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300 ease-out"
                      style={{ width: `${pythonProgress}%` }}
                    ></div>
                  </div>
                  {isPythonScanning && (
                    <p className="text-xs mt-2 animate-pulse text-red-600 font-bold font-mono uppercase">
                      [!] ENUMERATING SENSITIVE DIRECTORIES...
                    </p>
                  )}
                  
                  {/* Ghost Mode Status */}
                  {stealthMode && (
                    <div className="mt-2 p-2 bg-black border-l-4 border-yellow-500 text-[10px] font-mono">
                      <span className="text-yellow-500 font-bold uppercase underline">GHOST_STATUS:</span>
                      <span className="ml-2 text-white italic">{currentProxy}</span>
                    </div>
                  )}

                  {/* Target Command Center (Python Terminal) */}
                  <div className="bg-black text-green-500 p-4 font-mono text-[10px] h-48 overflow-y-auto border-2 border-green-900 mt-4 custom-scrollbar">
                    <p className="text-white font-bold uppercase border-b border-green-900/30 pb-1 mb-2">
                      [SYSTEM_READY] TARGET_ENGAGED: {discoveryTarget}
                    </p>
                    {pythonLogs.length === 0 ? (
                      <p className="opacity-50 italic">Waiting for engine output...</p>
                    ) : (
                      pythonLogs.map((log, i) => (
                        <p key={i} className="mt-1 break-all">
                          <span className="text-blue-400">[{new Date().toLocaleTimeString()}]</span> {log}
                        </p>
                      ))
                    )}
                    <div ref={pythonLogEndRef} />
                  </div>

                  {/* Vulnerability Stream (Live Hits) */}
                  {vulnerabilities.length > 0 && (
                    <div className="mt-6 border-4 border-red-600 p-4 bg-red-50 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black text-red-700 uppercase flex items-center gap-2">
                          <span className="animate-pulse">🎯</span> Payload Hits (Live)
                        </h2>
                        <button 
                          onClick={() => setVulnerabilities([])}
                          className="text-[10px] bg-red-600 text-white px-2 py-1 font-bold uppercase hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        >
                          Clear Stream
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {vulnerabilities.map((v, i) => (
                          <div key={i} className="bg-white border-2 border-red-600 p-2 font-mono text-xs shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="bg-red-600 text-white px-2 font-bold uppercase tracking-tighter">FOUND_{v.type}</span>
                              <span className="text-[10px] opacity-50">{new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="truncate"><span className="font-bold text-black">URL:</span> {v.url}</p>
                              <p><span className="font-bold text-black">PARAM:</span> <span className="text-red-600 font-bold">{v.param}</span></p>
                              <p className="break-all bg-gray-100 p-1 border border-gray-200"><span className="font-bold text-black">PAYLOAD:</span> {v.payload}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col h-full space-y-4">
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-mono uppercase opacity-50 mb-2">Live Discovery Feed (JS)</label>
                <div className="flex-1 bg-[#141414] text-[#E4E3E0] p-4 font-mono text-xs overflow-y-auto max-h-[200px] border-l-4 border-indigo-500 shadow-inner">
                  {discoveryLogs.length === 0 ? (
                    <div className="opacity-30 italic">Waiting for JS discovery...</div>
                  ) : (
                    <div className="space-y-1">
                      {discoveryLogs.map((log, i) => (
                        <div key={i} className={`flex items-center gap-2 ${log.found ? 'text-emerald-400 font-bold' : 'opacity-50'}`}>
                          <span className="text-[10px] opacity-50">[{log.type.toUpperCase()}]</span>
                          <span className="flex-1 truncate">{log.item}</span>
                          <span className={`px-1 rounded text-[10px] ${log.found ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-mono uppercase opacity-50 mb-2">Python Discovery Results</label>
                <div className="flex-1 bg-black text-green-400 p-4 font-mono text-xs overflow-y-auto max-h-[200px] border-l-4 border-green-500 shadow-inner">
                  {discoveredPaths.length === 0 ? (
                    <div className="opacity-30 italic">// Discovery logs started...</div>
                  ) : (
                    <div className="space-y-1">
                      {discoveredPaths.map((path, index) => (
                        <p key={index}>[FOUND] {path} -&gt; 200 OK</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loot Box Section */}
        <section className="mt-8 border-4 border-black p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold uppercase flex items-center gap-2">
              <Database className="w-6 h-6" /> 💰 Persistent Loot Box
            </h2>
            <button 
              onClick={handleGenerateReport}
              className="bg-red-600 text-white px-4 py-2 border-2 border-black font-bold hover:bg-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2"
            >
              📄 GENERATE PDF REPORT
            </button>
            <button 
              onClick={handleSelfDestruct}
              className="bg-black text-red-500 px-4 py-2 border-2 border-red-600 font-bold hover:bg-red-900 hover:text-white shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2"
            >
              💀 PANIC: SELF DESTRUCT
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black font-mono text-sm">
              <thead className="bg-yellow-400 text-black">
                <tr>
                  <th className="border-2 border-black p-3 text-left uppercase">Target URL</th>
                  <th className="border-2 border-black p-3 text-left uppercase">SQLi Risk</th>
                  <th className="border-2 border-black p-3 text-left uppercase">Time</th>
                  <th className="border-2 border-black p-3 text-left uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lootBox.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border-2 border-black p-8 text-center opacity-30 italic">
                      No loot discovered yet. Start a discovery scan to populate this database.
                    </td>
                  </tr>
                ) : (
                  lootBox.map((item, index) => (
                    <tr key={index} className="odd:bg-gray-100 even:bg-white hover:bg-yellow-50 transition-colors">
                      <td className="border-2 border-black p-3 text-blue-600 underline break-all">
                        <a href={item.target} target="_blank" rel="noopener noreferrer">{item.target}</a>
                      </td>
                      <td className={`border-2 border-black p-3 font-bold ${item.sqli_risk === 'HIGH' ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                        {item.sqli_risk}
                      </td>
                      <td className="border-2 border-black p-3 opacity-50 text-xs">{item.timestamp}</td>
                      <td className="border-2 border-black p-3">
                        <button 
                          onClick={() => analyzeVulnerability(item)}
                          className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase hover:bg-emerald-600 transition-all flex items-center gap-1"
                        >
                          <BrainCircuit className="w-3 h-3" /> Analyze
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Shell Generator Section */}
        <section className="border border-[#141414] bg-white p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <h2 className="text-xs font-mono uppercase opacity-50 mb-6 flex items-center gap-2">
            <Code className="w-4 h-4" /> Payload Sniper (Shell Generator)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Listener IP (Your IP)</label>
              <input
                type="text"
                value={shellIp}
                onChange={(e) => setShellIp(e.target.value)}
                placeholder="192.168.1.5"
                className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-sm focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Listener Port</label>
              <input
                type="text"
                value={shellPort}
                onChange={(e) => setShellPort(e.target.value)}
                placeholder="4444"
                className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-sm focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Shell Type</label>
              <select
                value={shellType}
                onChange={(e) => setShellType(e.target.value)}
                className="p-3 border-2 border-[#141414] bg-[#f9f9f9] font-mono text-sm focus:outline-none appearance-none cursor-pointer"
              >
                <option value="bash">Bash Reverse Shell</option>
                <option value="python">Python Reverse Shell</option>
                <option value="powershell">PowerShell Reverse Shell</option>
              </select>
            </div>
          </div>

          <AnimatePresence>
            {generatedPayload && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="bg-[#141414] text-[#E4E3E0] p-6 font-mono text-xs break-all rounded-sm border-l-4 border-emerald-500">
                  <div className="mb-2 opacity-50 uppercase text-[10px] flex justify-between">
                    <span>Generated Payload</span>
                    <span>{shellType}</span>
                  </div>
                  {generatedPayload}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors rounded-sm flex items-center gap-2 text-[10px] uppercase font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Predator Eye (Network Sniffer) Section */}
        <section className="border-4 border-black p-8 bg-black text-emerald-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold uppercase text-white flex items-center gap-2">
              <Eye className={`w-6 h-6 ${isSniffing ? 'animate-pulse text-red-500' : ''}`} /> 
              📡 THE PREDATOR EYE (LIVE NETWORK TRAFFIC)
            </h2>
            <div className="flex gap-4">
              {!isSniffing ? (
                <button 
                  onClick={startSniffing}
                  className="bg-emerald-600 text-black px-6 py-2 font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 uppercase tracking-tighter"
                >
                  <Play className="w-4 h-4" /> START SNIFFING
                </button>
              ) : (
                <button 
                  onClick={stopSniffing}
                  className="bg-red-600 text-white px-6 py-2 font-bold hover:bg-red-400 transition-all flex items-center gap-2 uppercase tracking-tighter"
                >
                  <Square className="w-4 h-4" /> STOP SNIFFING
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-[#0a0a0a] border-2 border-emerald-900/30 p-4 h-80 overflow-y-auto custom-scrollbar relative flex-1">
              {!isSniffing && packets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <div className="text-center">
                    <Eye className="w-16 h-16 mx-auto mb-4" />
                    <p className="uppercase tracking-[0.2em] text-sm">Waiting for activation...</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                {packets.map((p, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    onClick={() => setSelectedPacket(p)}
                    className={`grid grid-cols-12 gap-2 text-[10px] py-1 border-b transition-colors cursor-pointer ${
                      p.isCredential 
                        ? 'border-red-900/30 bg-red-900/20 hover:bg-red-900/30 text-red-400' 
                        : selectedPacket === p 
                          ? 'border-emerald-500/50 bg-emerald-900/30' 
                          : 'border-emerald-900/10 hover:bg-emerald-900/10'
                    }`}
                  >
                    <span className={`col-span-2 ${p.isCredential ? 'text-red-500' : 'text-emerald-600'}`}>
                      [{new Date().toLocaleTimeString()}]
                    </span>
                    {p.isCredential ? (
                      <span className="col-span-10 font-bold truncate flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        CREDENTIAL FOUND: {p.payload}
                      </span>
                    ) : (
                      <>
                        <span className="col-span-3 font-bold truncate">{p.src}</span>
                        <span className="col-span-1 text-center opacity-50">→</span>
                        <span className="col-span-3 font-bold truncate">{p.dst}</span>
                        <span className="col-span-2 text-center bg-emerald-900/30 text-emerald-300 rounded px-1">{p.proto}</span>
                        <span className="col-span-1 text-right opacity-50">{p.size}</span>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Deep Packet Inspector Panel */}
            {selectedPacket && !selectedPacket.isCredential && (
              <div className="w-80 bg-zinc-900 border-2 border-yellow-500 p-4 font-mono text-[10px] flex flex-col h-80">
                <h3 className="text-yellow-500 mb-2 border-b border-yellow-500 pb-1">DEEP_PACKET_INSPECTOR</h3>
                
                <div className="text-blue-400 mt-2">NETWORK LAYER:</div>
                <pre className="text-white mt-1">SRC: {selectedPacket.src} → DST: {selectedPacket.dst}</pre>
                
                <div className="text-blue-400 mt-4">DATA PAYLOAD (ASCII):</div>
                <div className="bg-black p-2 text-green-500 break-all border border-zinc-700 mt-1 flex-1 overflow-y-auto">
                  {selectedPacket.payload_ascii || "NO_READABLE_DATA"}
                </div>
                
                <button onClick={() => setSelectedPacket(null)} className="mt-4 text-red-500 hover:text-red-400 text-left">
                  [CLOSE_INSPECTOR]
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] opacity-50 uppercase tracking-widest">
            <span>Interface: Default (Auto-detect)</span>
            <span>Buffer: {packets.length}/20 Packets</span>
          </div>

          {/* DNS Decoder Panel */}
          <div className="bg-zinc-950 border-2 border-blue-500 p-4 font-mono mt-4">
            <h3 className="text-blue-500 text-xs mb-2 flex items-center">
              <span className="animate-ping mr-2">🎯</span> DNS SNIPER ACTIVE
            </h3>
            <div className="space-y-2">
              {dnsHits.map((hit, i) => (
                <div key={i} className="flex justify-between text-[11px] bg-blue-900/20 p-2 border-l-2 border-blue-500">
                  <span className="text-zinc-400">[{new Date(hit.timestamp * 1000).toLocaleTimeString()}]</span>
                  <span className="text-white font-bold">{hit.src}</span>
                  <span className="text-blue-400">IS BROWSING</span>
                  <span className="text-yellow-400 underline">{hit.query}</span>
                </div>
              ))}
              {dnsHits.length === 0 && <p className="text-zinc-700 text-center">WAITING FOR DOMAIN QUERIES...</p>}
            </div>
          </div>
        </section>

        {/* Input Section */}
        <section className="border border-[#141414] bg-white p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono uppercase opacity-50 tracking-wider">
                Target Domain / IP Address
              </label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g., google.com"
                    className="w-full pl-12 pr-4 py-4 border-2 border-[#141414] focus:outline-none focus:ring-0 bg-[#f9f9f9] font-mono text-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Initiate Scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-100 border-2 border-red-600 text-red-600 font-mono flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Recon & Summary */}
              <div className="space-y-8">
                <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <h2 className="text-xs font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Recon Module
                  </h2>
                  <div className="space-y-4 font-mono">
                    <div className="flex justify-between border-b border-dashed border-[#141414]/20 pb-2">
                      <span className="opacity-50">Target:</span>
                      <span className="font-bold">{result.target}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#141414]/20 pb-2">
                      <span className="opacity-50">IP Address:</span>
                      <span className="font-bold">{result.ip}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#141414]/20 pb-2">
                      <span className="opacity-50">Timestamp:</span>
                      <span className="text-xs">{new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#141414]/20 pb-2">
                      <span className="opacity-50">Risk Level:</span>
                      <span className={`font-bold ${calculateRisk(result.headers, result.ports.filter(p => p.status === 'OPEN').map(p => p.port), result.target) === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>
                        {calculateRisk(result.headers, result.ports.filter(p => p.status === 'OPEN').map(p => p.port), result.target)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <h2 className="text-xs font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Vulnerabilities
                  </h2>
                  <div className="space-y-2">
                    {(() => {
                      // Single Source of Truth: Filter headers that are actually VULNERABLE
                      const headerVulns = (Object.entries(result.headers) as [string, HeaderData][])
                        .filter(([_, data]) => data.status === "VULNERABLE")
                        .map(([name]) => `⚠️ Missing security header: ${name}`);
                      
                      // Combine with other vulnerabilities (SQLi, Ports, etc.)
                      const otherVulns = result.vulnerabilities.filter(v => !v.toLowerCase().includes("missing security header"));
                      const allVulns = [...headerVulns, ...otherVulns];

                      return allVulns.length > 0 ? (
                        allVulns.map((vuln, i) => (
                          <div key={i} className="flex gap-3 text-sm font-mono text-red-600 bg-red-50 p-2 border border-red-200">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {vuln}
                          </div>
                        ))
                      ) : (
                        <div className="flex gap-3 text-sm font-mono text-green-600 bg-green-50 p-2 border border-green-200">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="font-bold uppercase">✅ NO CRITICAL MISSING HEADERS</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <h2 className="text-xs font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Database Module
                  </h2>
                  <div className="font-mono">
                    {result.sqli_error ? (
                      <div className="text-xs opacity-50 italic">{result.sqli_error}</div>
                    ) : (
                      <div className={`p-3 border-2 flex items-center justify-between ${result.sqli_detected ? 'border-red-600 bg-red-50 text-red-600' : 'border-green-600 bg-green-50 text-green-600'}`}>
                        <span className="text-xs font-bold uppercase">SQLi Status:</span>
                        <span className="text-xs font-bold">{result.sqli_detected ? 'VULNERABLE' : 'SECURE'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Column: Header Sniper */}
              <div className="lg:col-span-2 space-y-8">
                <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <h2 className="text-xs font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Header Sniper
                  </h2>
                  {result.headers_error ? (
                    <div className="text-red-500 font-mono text-sm">{result.headers_error}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.entries(result.headers) as [string, HeaderData][]).map(([name, data]) => {
                        const isSafe = data.status.startsWith('SAFE');
                        
                        return (
                          <div 
                            key={name} 
                            className={`p-4 border-2 ${isSafe ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-mono font-bold uppercase truncate mr-2">{name}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSafe ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                {data.status}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono opacity-70 break-all">
                              {data.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                  <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <h2 className="text-xs font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> Port Scanner
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {result.ports
                        .filter(p => p.status === 'OPEN' || [80, 443, 22, 21, 8080].includes(p.port))
                        .map((p) => (
                        <div 
                          key={p.port} 
                          className={`p-2 border-2 ${p.status === 'OPEN' ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-200 opacity-50'}`}
                        >
                          <span className="text-xs font-bold font-mono">{p.port}</span>
                          <p className="text-[10px] font-mono uppercase">{p.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-4 border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-bold mb-6 uppercase flex items-center gap-2">
                      <Shield className="w-6 h-6" /> 🛡️ Attack Surface Map
                    </h2>
                    
                    <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                      {/* The Chart */}
                      <div className="relative">
                        <PortChart 
                          open={result.ports.filter(p => p.status === 'OPEN').length} 
                          closed={result.ports.filter(p => p.status !== 'OPEN').length} 
                        /> 
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <span className="block text-2xl font-black">{result.ports.filter(p => p.status === 'OPEN').length}</span>
                            <span className="text-[10px] uppercase font-bold opacity-50">Open</span>
                          </div>
                        </div>
                      </div>

                      {/* The Legend/Stats */}
                      <div className="text-sm font-mono space-y-3 flex-1">
                        <div className="flex justify-between items-center bg-gray-50 p-2 border border-black/5">
                          <span className="text-[10px] uppercase opacity-50">System Status</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            (() => {
                              const openPorts = result.ports.filter(p => p.status === 'OPEN').map(p => p.port);
                              const isOnlyWebPorts = openPorts.length > 0 && openPorts.every(p => p === 80 || p === 443);
                              return isOnlyWebPorts || openPorts.length === 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
                            })()
                          }`}>
                            {(() => {
                              const openPorts = result.ports.filter(p => p.status === 'OPEN').map(p => p.port);
                              const isOnlyWebPorts = openPorts.length > 0 && openPorts.every(p => p === 80 || p === 443);
                              return isOnlyWebPorts || openPorts.length === 0 ? 'SECURE' : 'VULNERABLE';
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-2 border border-black/5">
                          <span className="text-[10px] uppercase opacity-50">Risk Level</span>
                          <span className={`text-xs font-bold ${calculateRisk(result.headers, result.ports.filter(p => p.status === 'OPEN').map(p => p.port), result.target) === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>
                            {calculateRisk(result.headers, result.ports.filter(p => p.status === 'OPEN').map(p => p.port), result.target)}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase opacity-50 mb-1">Critical Entry Points</p>
                          <p className="text-red-600 font-bold underline break-all">
                            {result.ports.filter(p => p.status === 'OPEN').map(p => p.port).join(', ') || 'NONE DETECTED'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase opacity-50 mb-1">Filtered/Secure Ports</p>
                          <p className="text-green-600 break-all">
                            {result.ports.filter(p => p.status !== 'OPEN').map(p => p.port).join(', ')}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-black/10">
                          <p className="text-[10px] uppercase opacity-50 mb-1">AI Analyst Conclusion</p>
                          <p className="text-xs italic text-gray-600">
                            {(() => {
                              const openPorts = result.ports.filter(p => p.status === 'OPEN').map(p => p.port);
                              const isOnlyWebPorts = openPorts.length > 0 && openPorts.every(p => p === 80 || p === 443);
                              
                              if (isOnlyWebPorts) {
                                return "Standard secure profile detected. No immediate entry points found.";
                              }
                              
                              return openPorts.length > 0 
                                ? "Vulnerable surface detected. Recommend immediate firewall hardening." 
                                : "Standard secure profile detected. No immediate entry points found.";
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer / Terminal Style */}
        {!result && !loading && (
          <section className="border-2 border-[#141414] border-dashed p-12 text-center opacity-30">
            <Terminal className="w-12 h-12 mx-auto mb-4" />
            <p className="font-mono uppercase tracking-widest text-sm">
              Waiting for target input...
            </p>
          </section>
        )}
      </main>

      {/* Decorative Elements */}
      <div className="fixed bottom-6 left-6 flex gap-4 pointer-events-none">
        <div className="w-12 h-1 bg-[#141414]" />
        <div className="w-8 h-1 bg-[#141414]" />
        <div className="w-4 h-1 bg-[#141414]" />
        {/* AI Advisor Modal */}
        <AnimatePresence>
          {isAiModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-black border-2 border-emerald-500 p-6 w-full max-w-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] font-mono"
              >
                <div className="flex justify-between items-center border-b border-emerald-900 pb-4 mb-4">
                  <h3 className="text-emerald-400 font-bold uppercase flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5" /> 🤖 PREDATOR_AI_ADVISOR v1.0
                  </h3>
                  <button 
                    onClick={() => setIsAiModalOpen(false)}
                    className="text-emerald-900 hover:text-emerald-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="bg-[#050505] border border-emerald-900/30 p-4 h-[400px] overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-emerald-400">
                    {aiReport || "WAITING_FOR_DATA_INPUT..."}
                  </pre>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-[10px] text-emerald-900 uppercase">
                    Status: Analysis_Complete // Source: Gemini_Neural_Network
                  </div>
                  <button 
                    onClick={() => setIsAiModalOpen(false)}
                    className="bg-emerald-900 text-emerald-200 px-6 py-2 text-xs font-bold uppercase hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/30"
                  >
                    DISMISS_REPORT
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
