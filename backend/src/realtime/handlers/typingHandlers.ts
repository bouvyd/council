import type { HandlerContext } from "./context";

export function registerTypingHandlers({ socket, emitTypingUpdate }: HandlerContext) {
  socket.on("typing:update", (payload) => {
    const roomId = socket.data.roomId;

    if (!roomId || payload.roomId.trim().toLowerCase() !== roomId) {
      return;
    }

    emitTypingUpdate(payload.isTyping);
  });
}
