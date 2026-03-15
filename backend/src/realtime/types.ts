import type { Server, Socket } from "socket.io";
import type {
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  UserIdentity,
} from "@council/shared";

export type SocketData = {
  roomId?: string;
  user?: UserIdentity;
  voiceChannelId?: string;
};

export type ScreenShareState = {
  id: string;
  ownerSessionId: string;
  hasAudio: boolean;
};

export type VoiceChannelState = {
  id: string;
  name: string;
  isDefault: boolean;
  participantSessionIds: Set<string>;
  activeScreenShares: Map<string, ScreenShareState>;
};

export type RoomState = {
  id: string;
  users: Map<string, UserIdentity>;
  messages: Map<string, ChatMessage>;
  voiceChannels: Map<string, VoiceChannelState>;
};

export type TypedIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
