// Everything the React client needs to talk to the server, as types only:
// importing this file pulls no server or lib code into the client bundle
import type { Move } from "../../src/entrypoint.ts";

export type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomView,
} from "./events.ts";

export type {
  Action,
  RoundScore,
  Card,
  Suit,
  Phase,
  PlayerView,
  SeatView,
  PeekView,
} from "../../src/entrypoint.ts";

// Moves only the server sends: joining (createRoom / joinRoom) and the timers
type ServerOnlyMove = "addPlayer" | "endMemorizing" | "endPeek" | "countPoints";

// Omit that keeps each variant of a union separate
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// The payload of the `move` event. No seat: the server takes it from the session
export type ClientMove = DistributiveOmit<Exclude<Move, { type: ServerOnlyMove }>, "seat">;

// What the client emits, with typed payloads. The server declares the same
// events with `unknown` payloads because it must validate whatever arrives
export type ClientEvents = {
  createRoom: (payload: { name: string }) => void;
  joinRoom: (payload: { code: string; name: string }) => void;
  resume: (payload: { token: string }) => void;
  move: (move: ClientMove) => void;
  sit: () => void;
  rematch: () => void;
};
