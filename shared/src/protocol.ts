export type AckError = {
  ok: false;
  error: string;
};

export type AckSuccess<T> = {
  ok: true;
  data: T;
};

export type AckResult<T> = AckError | AckSuccess<T>;

export type UserIdentity = {
  sessionId: string;
  displayName: string;
};

export type RoomRef = {
  roomId: string;
};

export type RoomJoined = RoomRef & {
  user: UserIdentity;
};

export type CreateRoomInput = {
  displayName: string;
};

export type JoinRoomInput = {
  roomId: string;
  displayName: string;
};

export type RenameDisplayNameInput = {
  displayName: string;
};

export type SendMessageInput = {
  roomId: string;
  text: string;
  clientMessageId: string;
  replyToMessageId?: string;
};

export type TypingUpdateInput = {
  roomId: string;
  isTyping: boolean;
};

export type ReactionToggleInput = {
  roomId: string;
  messageId: string;
  emoji: string;
};

export type CheckRoomInput = {
  roomId: string;
};

export type UserChatMessage = {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  kind?: "user";
  clientMessageId?: string;
  replyToMessageId?: string;
  reactions?: Record<string, string[]>;
  author: UserIdentity;
};

export type SystemChatMessage = {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  kind: "system";
  author?: never;
  clientMessageId?: never;
  replyToMessageId?: never;
  reactions?: never;
};

export type ChatMessage = UserChatMessage | SystemChatMessage;

export type PresenceUpdate = {
  roomId: string;
  users: UserIdentity[];
};

export type TypingUpdate = {
  roomId: string;
  sessionId: string;
  isTyping: boolean;
};

export type MessageReactionUpdated = {
  roomId: string;
  messageId: string;
  reactions: Record<string, string[]>;
};

export type VoiceChannelRef = {
  roomId: string;
  channelId: string;
};

export type VoiceChannel = VoiceChannelRef & {
  name: string;
  isDefault: boolean;
  participants: UserIdentity[];
};

export type VoiceChannelsUpdate = {
  roomId: string;
  channels: VoiceChannel[];
};

export type VoiceChannelsGetInput = {
  roomId: string;
};

export type VoiceChannelCreateInput = {
  roomId: string;
  name?: string;
};

export type VoiceChannelJoinInput = VoiceChannelRef;

export type VoiceChannelLeaveInput = VoiceChannelRef;

export type VoiceSignal =
  | {
      type: "offer";
      sdp: string;
    }
  | {
      type: "answer";
      sdp: string;
    }
  | {
      type: "ice";
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
      usernameFragment?: string | null;
    };

export type VoiceSignalRelayInput = VoiceChannelRef & {
  toSessionId: string;
  signal: VoiceSignal;
};

export type VoiceSignalRelayed = VoiceChannelRef & {
  fromSessionId: string;
  signal: VoiceSignal;
};

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomInput,
    callback: (result: AckResult<RoomJoined>) => void,
  ) => void;
  "room:join": (
    payload: JoinRoomInput,
    callback: (result: AckResult<RoomJoined>) => void,
  ) => void;
  "room:check": (
    payload: CheckRoomInput,
    callback: (result: AckResult<{ exists: boolean }>) => void,
  ) => void;
  "room:rename": (
    payload: RenameDisplayNameInput,
    callback: (result: AckResult<RoomJoined>) => void,
  ) => void;
  "room:leave": (callback: (result: AckResult<RoomRef>) => void) => void;
  "message:send": (
    payload: SendMessageInput,
    callback: (result: AckResult<{ messageId: string }>) => void,
  ) => void;
  "typing:update": (payload: TypingUpdateInput) => void;
  "reaction:toggle": (payload: ReactionToggleInput) => void;
  "voice:channels:get": (
    payload: VoiceChannelsGetInput,
    callback: (result: AckResult<VoiceChannelsUpdate>) => void,
  ) => void;
  "voice:channel:create": (
    payload: VoiceChannelCreateInput,
    callback: (result: AckResult<VoiceChannelsUpdate>) => void,
  ) => void;
  "voice:channel:join": (
    payload: VoiceChannelJoinInput,
    callback: (result: AckResult<VoiceChannelsUpdate>) => void,
  ) => void;
  "voice:channel:leave": (
    payload: VoiceChannelLeaveInput,
    callback: (result: AckResult<VoiceChannelsUpdate>) => void,
  ) => void;
  "voice:signal": (payload: VoiceSignalRelayInput) => void;
}

export interface ServerToClientEvents {
  "room:presence": (payload: PresenceUpdate) => void;
  "message:created": (payload: ChatMessage) => void;
  "message:reaction-updated": (payload: MessageReactionUpdated) => void;
  "typing:update": (payload: TypingUpdate) => void;
  "system:error": (payload: { message: string }) => void;
  "voice:channels:updated": (payload: VoiceChannelsUpdate) => void;
  "voice:signal": (payload: VoiceSignalRelayed) => void;
}
