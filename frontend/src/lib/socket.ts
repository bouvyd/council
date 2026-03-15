import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@council/shared";

const defaultServerUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
const serverUrl = import.meta.env.VITE_SERVER_URL ?? defaultServerUrl;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
  autoConnect: true,
  transports: ["websocket"],
});
