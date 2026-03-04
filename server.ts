import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import * as pty from 'node-pty';
import os from 'os';
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = 3001;

io.on("connection", (socket) => {
  console.log("[SOCKET] Client connected");

  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd: process.cwd(),
    env: process.env as any
  });

  ptyProcess.onData((data) => socket.emit("terminal-output", data));
  socket.on("terminal-input", (data) => ptyProcess.write(data));

  socket.on("disconnect", () => {
    ptyProcess.kill();
    console.log("[SOCKET] Client disconnected");
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});