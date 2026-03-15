import { getVoiceChannelsUpdate } from "../roomState";
import type { HandlerContext } from "./context";

function normalizeRoomId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeChannelId(value: string): string {
  return value.trim().toLowerCase();
}

export function registerScreenHandlers({ io, socket, rooms }: HandlerContext) {
  socket.on("screen:share:start", (payload, callback) => {
    const roomId = socket.data.roomId;
    const user = socket.data.user;

    if (!roomId || !user) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Screen share room mismatch." });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    const channelId = normalizeChannelId(payload.channelId);
    const channel = room.voiceChannels.get(channelId);
    if (!channel) {
      callback({ ok: false, error: "Voice channel not found." });
      return;
    }

    if (!channel.participantSessionIds.has(socket.id)) {
      callback({ ok: false, error: "Join the voice channel before sharing." });
      return;
    }

    const shareId = payload.shareId.trim();
    if (!shareId) {
      callback({ ok: false, error: "Share id is required." });
      return;
    }

    if (
      [...channel.activeScreenShares.values()].some((share) => share.ownerSessionId === socket.id)
    ) {
      callback({ ok: false, error: "You are already sharing your screen." });
      return;
    }

    if (channel.activeScreenShares.has(shareId)) {
      callback({ ok: false, error: "Screen share already exists." });
      return;
    }

    channel.activeScreenShares.set(shareId, {
      id: shareId,
      ownerSessionId: socket.id,
      hasAudio: payload.hasAudio,
    });

    const update = getVoiceChannelsUpdate(room);
    io.to(room.id).emit("voice:channels:updated", update);
    callback({ ok: true, data: update });
  });

  socket.on("screen:share:stop", (payload, callback) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Screen share room mismatch." });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    const channelId = normalizeChannelId(payload.channelId);
    const channel = room.voiceChannels.get(channelId);
    if (!channel) {
      callback({ ok: false, error: "Voice channel not found." });
      return;
    }

    const shareId = payload.shareId.trim();
    const share = channel.activeScreenShares.get(shareId);
    if (!share) {
      callback({ ok: false, error: "Screen share not found." });
      return;
    }

    if (share.ownerSessionId !== socket.id) {
      callback({ ok: false, error: "Only the sharer can stop this screen share." });
      return;
    }

    channel.activeScreenShares.delete(shareId);

    const update = getVoiceChannelsUpdate(room);
    io.to(room.id).emit("voice:channels:updated", update);
    callback({ ok: true, data: update });
  });

  socket.on("screen:signal", (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    const channelId = normalizeChannelId(payload.channelId);
    const channel = room.voiceChannels.get(channelId);
    if (!channel) {
      return;
    }

    const share = channel.activeScreenShares.get(payload.shareId.trim());
    if (!share) {
      return;
    }

    const toSessionId = payload.toSessionId.trim();
    if (!toSessionId || toSessionId === socket.id) {
      return;
    }

    if (!room.users.has(toSessionId)) {
      return;
    }

    if (!channel.participantSessionIds.has(socket.id) || !channel.participantSessionIds.has(toSessionId)) {
      return;
    }

    const shareOwnerSessionId = share.ownerSessionId;
    if (socket.id !== shareOwnerSessionId && toSessionId !== shareOwnerSessionId) {
      return;
    }

    io.to(toSessionId).emit("screen:signal", {
      roomId,
      channelId,
      shareId: share.id,
      fromSessionId: socket.id,
      signal: payload.signal,
    });
  });
}
