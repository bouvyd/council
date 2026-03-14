import type { RoomState, TypedIO, TypedSocket } from "../types";

export type HandlerContext = {
  io: TypedIO;
  socket: TypedSocket;
  rooms: Map<string, RoomState>;
  emitTypingUpdate: (isTyping: boolean) => void;
};
