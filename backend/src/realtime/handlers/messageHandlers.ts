import { randomUUID } from "node:crypto";
import type { ChatMessage } from "@council/shared";
import type { HandlerContext } from "./context";

export function registerMessageHandlers({ io, socket, rooms, emitTypingUpdate }: HandlerContext) {
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
      replyToMessageId: payload.replyToMessageId?.trim() || undefined,
      reactions: {},
      author: user,
    };

    room.messages.set(message.id, message);
    io.to(room.id).emit("message:created", message);
    callback({ ok: true, data: { messageId: message.id } });
  });
}
