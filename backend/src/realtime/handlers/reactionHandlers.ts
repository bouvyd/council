import type { HandlerContext } from "./context";

const EMOJI_REGEX = /^\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*$/u;

function isValidEmoji(value: string): boolean {
  return EMOJI_REGEX.test(value);
}

export function registerReactionHandlers({ io, socket, rooms }: HandlerContext) {
  socket.on("reaction:toggle", (payload) => {
    const roomId = socket.data.roomId;
    const user = socket.data.user;

    if (!roomId || !user) {
      return;
    }

    if (payload.roomId.trim().toLowerCase() !== roomId) {
      return;
    }

    const messageId = payload.messageId.trim();
    const emoji = payload.emoji.trim();

    if (!messageId || !emoji || !isValidEmoji(emoji)) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    const message = room.messages.get(messageId);
    if (!message) {
      return;
    }

    if (message.kind === "system") {
      return;
    }

    const reactions = { ...(message.reactions ?? {}) };
    const currentSessionIds = new Set(reactions[emoji] ?? []);

    if (currentSessionIds.has(user.sessionId)) {
      currentSessionIds.delete(user.sessionId);
    } else {
      currentSessionIds.add(user.sessionId);
    }

    if (currentSessionIds.size === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = [...currentSessionIds];
    }

    message.reactions = reactions;
    room.messages.set(message.id, message);

    io.to(room.id).emit("message:reaction-updated", {
      roomId: room.id,
      messageId: message.id,
      reactions,
    });
  });
}
