import { randomUUID } from "node:crypto";
import type { PresenceUpdate, VoiceChannel, VoiceChannelsUpdate } from "@council/shared";
import { DEV_DEFAULT_ROOM_ID } from "../config";
import type { RoomState, VoiceChannelState } from "./types";

export const MAX_VOICE_CHANNELS_PER_ROOM = 3;
export const MAX_VOICE_PARTICIPANTS_PER_CHANNEL = 6;
const DEFAULT_VOICE_CHANNEL_ID = "voice-main";

export function createRoomId(): string {
  return randomUUID().slice(0, 8);
}

export function createDefaultVoiceChannels(): Map<string, VoiceChannelState> {
  return new Map([
    [
      DEFAULT_VOICE_CHANNEL_ID,
      {
        id: DEFAULT_VOICE_CHANNEL_ID,
        name: "main",
        isDefault: true,
        participantSessionIds: new Set(),
        activeScreenShares: new Map(),
      },
    ],
  ]);
}

export function getPresenceUpdate(room: RoomState): PresenceUpdate {
  return {
    roomId: room.id,
    users: [...room.users.values()],
  };
}

export function getVoiceChannelsUpdate(room: RoomState): VoiceChannelsUpdate {
  const channels: VoiceChannel[] = [...room.voiceChannels.values()].map((channel) => ({
    roomId: room.id,
    channelId: channel.id,
    name: channel.name,
    isDefault: channel.isDefault,
    participants: [...channel.participantSessionIds]
      .map((sessionId) => room.users.get(sessionId))
      .filter((user): user is NonNullable<typeof user> => Boolean(user)),
    activeScreenShares: [...channel.activeScreenShares.values()]
      .map((share) => {
        const owner = room.users.get(share.ownerSessionId);
        if (!owner) {
          return null;
        }

        return {
          roomId: room.id,
          channelId: channel.id,
          shareId: share.id,
          sessionId: owner.sessionId,
          displayName: owner.displayName,
          hasAudio: share.hasAudio,
        };
      })
      .filter((share): share is NonNullable<typeof share> => Boolean(share)),
  }));

  return {
    roomId: room.id,
    channels,
  };
}

export function removeOwnedScreenSharesFromVoiceChannel(channel: VoiceChannelState, socketId: string): boolean {
  let changed = false;

  for (const [shareId, share] of channel.activeScreenShares.entries()) {
    if (share.ownerSessionId === socketId) {
      channel.activeScreenShares.delete(shareId);
      changed = true;
    }
  }

  return changed;
}

export function removeSocketFromVoiceChannels(room: RoomState, socketId: string): boolean {
  let changed = false;

  for (const channel of room.voiceChannels.values()) {
    if (channel.participantSessionIds.delete(socketId)) {
      changed = true;
    }

    if (removeOwnedScreenSharesFromVoiceChannel(channel, socketId)) {
      changed = true;
    }
  }

  return changed;
}

export function removeSocketFromRoom(
  rooms: Map<string, RoomState>,
  socketId: string,
  roomId?: string,
): RoomState | undefined {
  if (!roomId) {
    return undefined;
  }

  const room = rooms.get(roomId);

  if (!room) {
    return undefined;
  }

  removeSocketFromVoiceChannels(room, socketId);

  room.users.delete(socketId);

  if (room.users.size === 0) {
    if (DEV_DEFAULT_ROOM_ID && room.id === DEV_DEFAULT_ROOM_ID) {
      return room;
    }

    rooms.delete(room.id);
    return undefined;
  }

  return room;
}
