import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  UserIdentity,
} from "@council/shared";

export type SocketData = {
  roomId?: string;
  user?: UserIdentity;
};

export type RoomState = {
  id: string;
  users: Map<string, UserIdentity>;
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
