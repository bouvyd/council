import type { UserIdentity } from "@council/shared";
import { createRoomId, getPresenceUpdate, removeSocketFromRoom } from "../roomState";
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
}
