import express from "express";
import http from "node:http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  },
});

// Phase 0 placeholder route.
app.get("/", (_req, res) => {
  res.send("Council backend is running.");
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
});

const port = Number(process.env.PORT ?? 3001);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
