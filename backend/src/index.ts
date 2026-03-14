import express from "express";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import type {
  ChatMessage,
  ClientToServerEvents,
  PresenceUpdate,
  ServerToClientEvents,
  UserIdentity,
} from "@council/shared";

type SocketData = {
  roomId?: string;
  user?: UserIdentity;
};

type RoomState = {
  id: string;
  users: Map<string, UserIdentity>;
};

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  server,
  {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  },
  },
);
const rooms = new Map<string, RoomState>();

app.get("/", (_req, res) => {
  res.send("Council backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function createRoomId(): string {
  return randomUUID().slice(0, 8);
}

function getPresenceUpdate(room: RoomState): PresenceUpdate {
  return {
    roomId: room.id,
    users: [...room.users.values()],
  };
}

function clearSocketMembership(socketId: string, roomId?: string): void {
  if (!roomId) {
    return;
  }

  const room = rooms.get(roomId);

  if (!room) {
    return;
  }

  room.users.delete(socketId);

  if (room.users.size === 0) {
    rooms.delete(room.id);
    return;
  }

  io.to(room.id).emit("room:presence", getPresenceUpdate(room));
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("room:create", (payload, callback) => {
    const displayName = payload.displayName.trim();

    if (!displayName) {
      callback({ ok: false, error: "Display name is required." });
      return;
    }

    clearSocketMembership(socket.id, socket.data.roomId);
    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
    }

    const roomId = createRoomId();
    const user: UserIdentity = {
      sessionId: socket.id,
      displayName,
    };

    rooms.set(roomId, {
      id: roomId,
      users: new Map([[socket.id, user]]),
    });

    socket.data.roomId = roomId;
    socket.data.user = user;
    socket.join(roomId);

    io.to(roomId).emit("room:presence", {
      roomId,
      users: [user],
    });

    callback({ ok: true, data: { roomId, user } });
  });

  socket.on("room:join", (payload, callback) => {
    const roomId = payload.roomId.trim().toLowerCase();
    const displayName = payload.displayName.trim();

    if (!roomId || !displayName) {
      callback({ ok: false, error: "Room id and display name are required." });
      return;
    }

    const room = rooms.get(roomId);

    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    clearSocketMembership(socket.id, socket.data.roomId);
    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
    }

    const user: UserIdentity = {
      sessionId: socket.id,
      displayName,
    };

    room.users.set(socket.id, user);
    socket.data.roomId = roomId;
    socket.data.user = user;
    socket.join(roomId);

    io.to(room.id).emit("room:presence", getPresenceUpdate(room));
    callback({ ok: true, data: { roomId: room.id, user } });
  });

  socket.on("room:leave", (callback) => {
    const roomId = socket.data.roomId;

    if (!roomId) {
      callback({ ok: false, error: "You are not in a room." });
      return;
    }

    clearSocketMembership(socket.id, roomId);
    socket.leave(roomId);
    socket.data.roomId = undefined;
    socket.data.user = undefined;

    callback({ ok: true, data: { roomId } });
  });

  socket.on("message:send", (payload, callback) => {
    const roomId = socket.data.roomId;
    const user = socket.data.user;

    if (!roomId || !user) {
      callback({ ok: false, error: "Join a room before sending messages." });
      return;
    }

    if (payload.roomId !== roomId) {
      callback({ ok: false, error: "Message room mismatch." });
      return;
    }

    const text = payload.text.trim();

    if (!text) {
      callback({ ok: false, error: "Message text is required." });
      return;
    }

    const room = rooms.get(roomId);

    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    const message: ChatMessage = {
      id: randomUUID(),
      roomId,
      text,
      createdAt: new Date().toISOString(),
      clientMessageId: payload.clientMessageId,
      author: user,
    };

    io.to(room.id).emit("message:created", message);
    callback({ ok: true, data: { messageId: message.id } });
  });

  socket.on("disconnect", () => {
    clearSocketMembership(socket.id, socket.data.roomId);
    socket.data.roomId = undefined;
    socket.data.user = undefined;
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const port = Number(process.env.PORT ?? 3001);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
