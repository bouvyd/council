import { removeSocketFromRoom, getPresenceUpdate, getVoiceChannelsUpdate, removeSocketFromVoiceChannels } from "./roomState";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { registerMessageHandlers } from "./handlers/messageHandlers";
import { registerTypingHandlers } from "./handlers/typingHandlers";
import { registerReactionHandlers } from "./handlers/reactionHandlers";
import { registerVoiceHandlers } from "./handlers/voiceHandlers";
import { registerScreenHandlers } from "./handlers/screenHandlers";
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
    registerReactionHandlers(handlerContext);
    registerVoiceHandlers(handlerContext);
    registerScreenHandlers(handlerContext);

    socket.on("disconnect", () => {
      emitTypingUpdate(false);

      const existingRoom = socket.data.roomId ? rooms.get(socket.data.roomId) : undefined;
      if (existingRoom) {
        const changed = removeSocketFromVoiceChannels(existingRoom, socket.id);
        if (changed) {
          io.to(existingRoom.id).emit("voice:channels:updated", getVoiceChannelsUpdate(existingRoom));
        }
      }

      const room = removeSocketFromRoom(rooms, socket.id, socket.data.roomId);
      if (room) {
        io.to(room.id).emit("room:presence", getPresenceUpdate(room));
      }

      socket.data.roomId = undefined;
      socket.data.user = undefined;
      socket.data.voiceChannelId = undefined;
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
