import { randomUUID } from "node:crypto";
import type { ChatMessage, UserIdentity } from "@council/shared";
import { createRoomId, getPresenceUpdate, removeSocketFromRoom } from "./roomState";
import type { RoomState, TypedIO } from "./types";

export function registerSocketHandlers(io: TypedIO, rooms: Map<string, RoomState>): void {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const emitTypingUpdate = (isTyping: boolean) => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;

      if (!roomId || !user) {
        return;
      }

      io.to(roomId).emit("typing:update", {
        roomId,
        sessionId: user.sessionId,
        isTyping,
      });
    };

    socket.on("room:create", (payload, callback) => {
      const displayName = payload.displayName.trim();

      if (!displayName) {
        callback({ ok: false, error: "Display name is required." });
        return;
      }

      const previousRoom = removeSocketFromRoom(rooms, socket.id, socket.data.roomId);
      if (previousRoom) {
        io.to(previousRoom.id).emit("room:presence", getPresenceUpdate(previousRoom));
      }
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

      const previousRoom = removeSocketFromRoom(rooms, socket.id, socket.data.roomId);
      if (previousRoom) {
        io.to(previousRoom.id).emit("room:presence", getPresenceUpdate(previousRoom));
      }
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

    socket.on("typing:update", (payload) => {
      const roomId = socket.data.roomId;

      if (!roomId || payload.roomId.trim().toLowerCase() !== roomId) {
        return;
      }

      emitTypingUpdate(payload.isTyping);
    });

    socket.on("room:leave", (callback) => {
      const roomId = socket.data.roomId;

      if (!roomId) {
        callback({ ok: false, error: "You are not in a room." });
        return;
      }

      emitTypingUpdate(false);

      const room = removeSocketFromRoom(rooms, socket.id, roomId);
      if (room) {
        io.to(room.id).emit("room:presence", getPresenceUpdate(room));
      }

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

      emitTypingUpdate(false);

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
      emitTypingUpdate(false);

      const room = removeSocketFromRoom(rooms, socket.id, socket.data.roomId);
      if (room) {
        io.to(room.id).emit("room:presence", getPresenceUpdate(room));
      }

      socket.data.roomId = undefined;
      socket.data.user = undefined;
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
