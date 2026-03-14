import { randomUUID } from "node:crypto";
import type { PresenceUpdate } from "@council/shared";
import type { RoomState } from "./types";

export function createRoomId(): string {
  return randomUUID().slice(0, 8);
}

export function getPresenceUpdate(room: RoomState): PresenceUpdate {
  return {
    roomId: room.id,
    users: [...room.users.values()],
  };
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

  room.users.delete(socketId);

  if (room.users.size === 0) {
    rooms.delete(room.id);
    return undefined;
  }

  return room;
}
