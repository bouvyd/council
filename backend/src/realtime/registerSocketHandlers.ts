import { removeSocketFromRoom, getPresenceUpdate } from "./roomState";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { registerMessageHandlers } from "./handlers/messageHandlers";
import { registerTypingHandlers } from "./handlers/typingHandlers";
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

    const handlerContext = {
      io,
      socket,
      rooms,
      emitTypingUpdate,
    };

    registerRoomHandlers(handlerContext);
    registerTypingHandlers(handlerContext);
    registerMessageHandlers(handlerContext);

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
