import { randomInt } from "node:crypto";
import { initGameState, type GameState } from "../../src/entrypoint.ts";

// 0/O and 1/I are left out so a code stays unambiguous when read aloud
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

export type Room = {
  code: string;
  state: GameState;
  names: Map<number, string>; // seat -> name, the lib knows only seats
};

export type RoomRegistry = Map<string, Room>;

export function createRoom(rooms: RoomRegistry): Room {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();

  const room: Room = { code, state: initGameState(), names: new Map() };
  rooms.set(code, room);
  return room;
}

export function findRoom(rooms: RoomRegistry, code: string): Room | undefined {
  return rooms.get(code.trim().toUpperCase());
}

// ========= Helper functions =============
function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return code;
}
