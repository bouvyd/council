import { randomUUID } from "node:crypto";
import type { ChatMessage, UserIdentity } from "@council/shared";
import { createDefaultVoiceChannels, createRoomId, getPresenceUpdate, getVoiceChannelsUpdate, removeSocketFromRoom } from "../roomState";
import type { HandlerContext } from "./context";

export function registerRoomHandlers({ io, socket, rooms, emitTypingUpdate }: HandlerContext) {
  socket.on("room:create", (payload, callback) => {
    const displayName = payload.displayName.trim();

    if (!displayName) {
      callback({ ok: false, error: "Display name is required." });
      return;
    }

    const previousRoom = removeSocketFromRoom(rooms, socket.id, socket.data.roomId);
    if (previousRoom) {
      io.to(previousRoom.id).emit("room:presence", getPresenceUpdate(previousRoom));
      io.to(previousRoom.id).emit("voice:channels:updated", getVoiceChannelsUpdate(previousRoom));
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
      messages: new Map(),
      voiceChannels: createDefaultVoiceChannels(),
    });

    socket.data.roomId = roomId;
    socket.data.user = user;
    socket.join(roomId);

    io.to(roomId).emit("room:presence", {
      roomId,
      users: [user],
    });
    const createdRoom = rooms.get(roomId);
    if (createdRoom) {
      io.to(roomId).emit("voice:channels:updated", getVoiceChannelsUpdate(createdRoom));
    }

    callback({ ok: true, data: { roomId, user } });
  });

  socket.on("room:check", (payload, callback) => {
    const roomId = payload.roomId.trim().toLowerCase();

    if (!roomId) {
      callback({ ok: false, error: "Room id is required." });
      return;
    }

    callback({ ok: true, data: { exists: rooms.has(roomId) } });
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
      io.to(previousRoom.id).emit("voice:channels:updated", getVoiceChannelsUpdate(previousRoom));
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
    io.to(room.id).emit("voice:channels:updated", getVoiceChannelsUpdate(room));
    callback({ ok: true, data: { roomId: room.id, user } });
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
      io.to(room.id).emit("voice:channels:updated", getVoiceChannelsUpdate(room));
    }

    socket.leave(roomId);
    socket.data.roomId = undefined;
    socket.data.user = undefined;
    socket.data.voiceChannelId = undefined;

    callback({ ok: true, data: { roomId } });
  });

  socket.on("room:rename", (payload, callback) => {
    const roomId = socket.data.roomId;
    const previousName = socket.data.user?.displayName;
    const displayName = payload.displayName.trim();

    if (!roomId) {
      callback({ ok: false, error: "You are not in a room." });
      return;
    }

    if (!displayName) {
      callback({ ok: false, error: "Display name is required." });
      return;
    }

    if (previousName && previousName === displayName) {
      callback({
        ok: true,
        data: {
          roomId,
          user: {
            sessionId: socket.id,
            displayName,
          },
        },
      });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    const user: UserIdentity = {
      sessionId: socket.id,
      displayName,
    };

    room.users.set(socket.id, user);
    socket.data.user = user;

    if (previousName) {
      const renameMessage: ChatMessage = {
        id: randomUUID(),
        roomId: room.id,
        text: `${previousName} shall henceforth be known as ${displayName}`,
        createdAt: new Date().toISOString(),
        kind: "system",
      };

      room.messages.set(renameMessage.id, renameMessage);
      io.to(room.id).emit("message:created", renameMessage);
    }

    io.to(room.id).emit("room:presence", getPresenceUpdate(room));
    callback({ ok: true, data: { roomId: room.id, user } });
  });
}
