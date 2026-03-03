import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import * as pty from 'node-pty';
import os from 'os';
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
// Yahan "io" define ho raha hai
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd: process.cwd(),
    env: process.env as any
  });

  ptyProcess.onData((data) => socket.emit("terminal-output", data));
  socket.on("terminal-input", (data) => ptyProcess.write(data));
  socket.on("disconnect", () => ptyProcess.kill());
});

// Port 3001 busy ho sakta hai, isliye hum check karenge
const PORT = 3001;
httpServer.listen(PORT, () => console.log(`🚀 Predator Server: http://localhost:${PORT}`));