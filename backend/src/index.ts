import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { CLIENT_ORIGIN, PORT } from "./config";
import { registerRoutes } from "./http/registerRoutes";
import { registerSocketHandlers } from "./realtime/registerSocketHandlers";
import type { RoomState, TypedIO } from "./realtime/types";

const app = express();
const server = http.createServer(app);
const io: TypedIO = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});
const rooms = new Map<string, RoomState>();

registerRoutes(app);
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
