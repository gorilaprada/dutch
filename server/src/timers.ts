import type { GameState, Move } from "../../src/entrypoint.ts";
import type { Room } from "./rooms.ts";

type Phase = GameState["phase"];

export type Timings = Readonly<{
  memorizeMs: number;
  peekMs: number;
  scoringMs: number; // how long the revealed hands stay on screen
}>;

export const DEFAULT_TIMINGS: Timings = {
  memorizeMs: 5000,
  peekMs: 3000,
  scoringMs: 5000,
};

export type RoomTimer = {
  phase: Phase;
  deadline: number; // epoch ms, sent to clients for a countdown
  handle: ReturnType<typeof setTimeout>;
};

// Phases that end on their own, and the server move that ends them
const TIMED: Partial<Record<Phase, { ms: keyof Timings; move: Move }>> = {
  memorizing: { ms: "memorizeMs", move: { type: "endMemorizing" } },
  peeking: { ms: "peekMs", move: { type: "endPeek" } },
  scoring: { ms: "scoringMs", move: { type: "countPoints" } },
};

// The lib reaches timed phases from many moves, so the timer follows the
// phase after every state change instead of the move that was made
export function schedule(room: Room, timings: Timings, onFire: (move: Move) => void): void {
  const phase = room.state.phase;
  // Same phase: keep the running timer (e.g. a lobby leave or a wrong stack)
  if (room.timer?.phase === phase) return;

  clearTimer(room);
  const timed = TIMED[phase];
  if (!timed) return;

  const ms = timings[timed.ms];
  const handle = setTimeout(() => {
    room.timer = null;
    onFire(timed.move);
  }, ms);
  room.timer = { phase, deadline: Date.now() + ms, handle };
}

export function clearTimer(room: Room): void {
  if (room.timer) clearTimeout(room.timer.handle);
  room.timer = null;
}
