import { randomInt } from "node:crypto";
import { initGameState, type GameState } from "../../src/entrypoint.ts";
import type { RoomTimer } from "./timers.ts";

// 0/O and 1/I are left out so a code stays unambiguous when read aloud
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

// One per player who joined, kept across reconnects. The lib knows only seats
export type Session = {
  token: string; // secret, only ever sent to its owner
  seat: number | null; // null = watcher, no seat in the game
  name: string;
  socketId: string | null; // null = disconnected, seat held during grace
  grace: { deadline: number; handle: ReturnType<typeof setTimeout> } | null;
};

export type Room = {
  code: string;
  state: GameState;
  sessions: Map<string, Session>; // token -> session
  timer: RoomTimer | null;
};

export type RoomRegistry = Map<string, Room>;

export function createRoom(rooms: RoomRegistry): Room {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();

  const room: Room = { code, state: initGameState(), sessions: new Map(), timer: null };
  rooms.set(code, room);
  return room;
}

export function findRoom(rooms: RoomRegistry, code: string): Room | undefined {
  return rooms.get(code.trim().toUpperCase());
}

export function clearGrace(session: Session): void {
  if (session.grace) clearTimeout(session.grace.handle);
  session.grace = null;
}

// ========= Helper functions =============
function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return code;
}
