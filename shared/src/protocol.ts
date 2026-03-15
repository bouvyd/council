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
}

export interface ServerToClientEvents {
  "room:presence": (payload: PresenceUpdate) => void;
  "message:created": (payload: ChatMessage) => void;
  "message:reaction-updated": (payload: MessageReactionUpdated) => void;
  "typing:update": (payload: TypingUpdate) => void;
  "system:error": (payload: { message: string }) => void;
}
