import { randomUUID } from "node:crypto";
import {
  MAX_VOICE_CHANNELS_PER_ROOM,
  MAX_VOICE_PARTICIPANTS_PER_CHANNEL,
  getVoiceChannelsUpdate,
  removeOwnedScreenSharesFromVoiceChannel,
  removeSocketFromVoiceChannels,
} from "../roomState";
import type { HandlerContext } from "./context";

function normalizeRoomId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeChannelId(value: string): string {
  return value.trim().toLowerCase();
}

export function registerVoiceHandlers({ io, socket, rooms }: HandlerContext) {
  socket.on("voice:channels:get", (payload, callback) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Voice room mismatch." });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    callback({ ok: true, data: getVoiceChannelsUpdate(room) });
  });

  socket.on("voice:channel:create", (payload, callback) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Voice room mismatch." });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      callback({ ok: false, error: "Room not found." });
      return;
    }

    if (room.voiceChannels.size >= MAX_VOICE_CHANNELS_PER_ROOM) {
      callback({ ok: false, error: "Maximum voice channels reached." });
      return;
    }

    const name = payload.name?.trim() || `Voice ${room.voiceChannels.size + 1}`;
    const channelId = `voice-${randomUUID().slice(0, 8)}`;

    room.voiceChannels.set(channelId, {
      id: channelId,
      name,
      isDefault: false,
      participantSessionIds: new Set(),
      activeScreenShares: new Map(),
    });

    const update = getVoiceChannelsUpdate(room);
    io.to(room.id).emit("voice:channels:updated", update);
    callback({ ok: true, data: update });
  });

  socket.on("voice:channel:join", (payload, callback) => {
    const roomId = socket.data.roomId;
    const user = socket.data.user;

    if (!roomId || !user) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Voice room mismatch." });
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

    if (!channel.participantSessionIds.has(socket.id) && channel.participantSessionIds.size >= MAX_VOICE_PARTICIPANTS_PER_CHANNEL) {
      callback({ ok: false, error: "Voice channel is full." });
      return;
    }

    removeSocketFromVoiceChannels(room, socket.id);
    channel.participantSessionIds.add(socket.id);
    socket.data.voiceChannelId = channel.id;

    const update = getVoiceChannelsUpdate(room);
    io.to(room.id).emit("voice:channels:updated", update);
    callback({ ok: true, data: update });
  });

  socket.on("voice:channel:leave", (payload, callback) => {
    const roomId = socket.data.roomId;

    if (!roomId) {
      callback({ ok: false, error: "Join a room first." });
      return;
    }

    if (normalizeRoomId(payload.roomId) !== roomId) {
      callback({ ok: false, error: "Voice room mismatch." });
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

    channel.participantSessionIds.delete(socket.id);
    removeOwnedScreenSharesFromVoiceChannel(channel, socket.id);
    if (socket.data.voiceChannelId === channel.id) {
      socket.data.voiceChannelId = undefined;
    }

    const update = getVoiceChannelsUpdate(room);
    io.to(room.id).emit("voice:channels:updated", update);
    callback({ ok: true, data: update });
  });

  socket.on("voice:signal", (payload) => {
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

    io.to(toSessionId).emit("voice:signal", {
      roomId,
      channelId,
      fromSessionId: socket.id,
      signal: payload.signal,
    });
  });
}
