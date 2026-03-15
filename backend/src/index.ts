import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { CLIENT_ORIGIN, DEV_DEFAULT_ROOM_ID, PORT } from "./config";
import { registerRoutes } from "./http/registerRoutes";
import { registerSocketHandlers } from "./realtime/registerSocketHandlers";
import { createDefaultVoiceChannels } from "./realtime/roomState";
import type { RoomState, TypedIO } from "./realtime/types";

const app = express();
const server = http.createServer(app);
const io: TypedIO = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});
const rooms = new Map<string, RoomState>();

if (DEV_DEFAULT_ROOM_ID) {
  rooms.set(DEV_DEFAULT_ROOM_ID, {
    id: DEV_DEFAULT_ROOM_ID,
    users: new Map(),
    messages: new Map(),
    voiceChannels: createDefaultVoiceChannels(),
  });
  console.log(`Dev default room initialized: #${DEV_DEFAULT_ROOM_ID}`);
}

registerRoutes(app);
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
