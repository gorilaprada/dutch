import type { GameState, Move } from "../../src/entrypoint.ts";
import type { Room } from "./rooms.ts";

type Phase = GameState["phase"];

export type Timings = Readonly<{
  memorizeMs: number;
  peekMs: number;
  scoringMs: number; // how long the revealed hands stay on screen
  roundBreakMs: number; // how long the round summary stays before the next deal
  reconnectMs: number; // how long a disconnected player's seat is held
}>;

export const DEFAULT_TIMINGS: Timings = {
  memorizeMs: 5000,
  peekMs: 3000,
  scoringMs: 5000,
  roundBreakMs: 10_000,
  reconnectMs: 30_000,
};

// What a timer ends: a lib phase, or the server's break between rounds
type TimedStep = Phase | "roundBreak";
export type TimerEnd = Move | { type: "endRoundBreak" };

export type RoomTimer = {
  phase: TimedStep;
  deadline: number; // epoch ms, sent to clients for a countdown
  handle: ReturnType<typeof setTimeout>;
};

// Phases that end on their own, and the server move that ends them
const TIMED: Partial<Record<TimedStep, { ms: "memorizeMs" | "peekMs" | "scoringMs" | "roundBreakMs"; end: TimerEnd }>> = {
  memorizing: { ms: "memorizeMs", end: { type: "endMemorizing" } },
  peeking: { ms: "peekMs", end: { type: "endPeek" } },
  scoring: { ms: "scoringMs", end: { type: "countPoints" } },
  roundBreak: { ms: "roundBreakMs", end: { type: "endRoundBreak" } },
};

// The lib reaches timed phases from many moves, so the timer follows the
// phase after every state change instead of the move that was made
export function schedule(room: Room, timings: Timings, onFire: (end: TimerEnd) => void): void {
  const phase: TimedStep = room.roundBreak ? "roundBreak" : room.state.phase;
  // Same phase: keep the running timer (e.g. a lobby leave or a wrong stack)
  if (room.timer?.phase === phase) return;

  clearTimer(room);
  const timed = TIMED[phase];
  if (!timed) return;

  const ms = timings[timed.ms];
  const handle = setTimeout(() => {
    room.timer = null;
    onFire(timed.end);
  }, ms);
  room.timer = { phase, deadline: Date.now() + ms, handle };
}

export function clearTimer(room: Room): void {
  if (room.timer) clearTimeout(room.timer.handle);
  room.timer = null;
}
