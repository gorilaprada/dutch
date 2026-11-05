import type { PlayerView } from "../../src/entrypoint.ts";

// What every socket in a room receives after each change
export type RoomView = Readonly<{
  code: string;
  names: Readonly<Record<number, string>>; // seat -> name
  view: PlayerView;
  deadline: number | null; // epoch ms when the current timed phase ends
}>;

export type ClientToServerEvents = {
  createRoom: (payload: unknown) => void;
  joinRoom: (payload: unknown) => void;
  move: (payload: unknown) => void;
};

export type ServerToClientEvents = {
  roomJoined: (payload: { code: string; seat: number }) => void;
  roomError: (message: string) => void;
  moveError: (message: string) => void;
  view: (payload: RoomView) => void;
};

export type InterServerEvents = Record<string, never>;

// Set once a socket has created or joined a room
export type SocketData = {
  code?: string;
  seat?: number;
};
