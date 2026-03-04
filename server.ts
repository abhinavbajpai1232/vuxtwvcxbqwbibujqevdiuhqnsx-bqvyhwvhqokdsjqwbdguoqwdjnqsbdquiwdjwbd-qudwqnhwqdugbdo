import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import * as pty from 'node-pty';
import os from 'os';
import cors from "cors";

const app = express();
app.use(cors());

// 1. Ek hi HTTP Server banayein
const httpServer = createServer(app);

// 2. Sirf EK BAAR Socket.io setup karein (Port 3001 ke liye)
const io = new Server(httpServer, { 
  cors: { origin: "*" } 
});

const PORT = 3001;

// 3. Connection Logic (Terminal + Logs)
io.on("connection", (socket) => {
  console.log("[SOCKET.IO] Client connected to Predator Bridge");

  // OS ke hisaab se shell select karein
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as any
  });

  // Terminal output frontend ko bhejna
  ptyProcess.onData((data) => {
    socket.emit("terminal-output", data);
  });

  // Frontend se command receive karna
  socket.on("terminal-input", (data) => {
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  socket.on("disconnect", () => {
    console.log("[SOCKET.IO] Client disconnected");
    ptyProcess.kill();
  });
});

// 4. Server Start
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Predator Server Running on: http://localhost:${PORT}`);
});