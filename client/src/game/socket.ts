import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerToClientEvents } from "./protocol.ts";

export type GameSocket = Socket<ServerToClientEvents, ClientEvents>;

// Same origin: Express serves the build in production, Vite proxies /socket.io
// in dev. autoConnect off so the provider decides when, and tests can fake it
export function createSocket(): GameSocket {
  return io({ autoConnect: false });
}
