import type { GameState, GameResult, Move } from "./types.ts";
import {
  discardCard,
  drawFrom,
  dutch,
  switchCards,
  stack,
  jackPower,
  queenPower,
} from "./moves.ts";
import {
  addPlayer,
  setPlayerReady,
  removePlayer,
  startGame,
  endMemorizing,
  endPeek,
  countPoints,
  initGameState,
} from "./gameState.ts";
import { ok, fail } from "./result.ts";

export function applyMove(state: GameState, move: Move, random: () => number): GameResult {
  switch (move.type) {
    case "addPlayer":
      return addPlayer(state);
    case "ready":
      return setPlayerReady(state, move.seat);
    case "discard":
      return discardCard(state, move.seat);
    case "dutch":
      return dutch(state, move.seat)
    case "leave":
      return removePlayer(state, move.seat);
    case "start":
      return startGame(state, random)
    case "draw":
      return drawFrom(state, move.seat, move.from, random);
    case "switch":
      return switchCards(state, move.seat, move.handIndex);
    case "stack":
      return stack(state, move.seat, move.handIndex, random);
    case "jack": 
      return jackPower(state, move.seat, move.seat1, move.seat2, move.i1, move.i2);
    case "queen":
      return queenPower(state, move.seat, move.targetSeat, move.handIndex);
    case "endMemorizing":
      return endMemorizing(state);
    case "endPeek":
      return endPeek(state);
    case "countPoints":
      return countPoints(state, random);
    default: {
      // Compile error here means a Move variant has no case above
      const unhandled: never = move;
      return fail(`Could not perform move: ${JSON.stringify(unhandled)}`);
    }
  }
}

export function parseMove(input: unknown, seat: number): Move | null {
  if (typeof input !== "object" || input === null || !("type" in input) || typeof input.type !== "string") return null;
  const move = input as Record<string, unknown>;
 
  switch (move.type) {
    case "addPlayer":
      return { type: "addPlayer" };
    case "ready":
    case "discard":
    case "dutch":
    case "leave":
      return { type: move.type, seat};
    case "start":
      return { type: "start" };
    case "draw":
      if (move.from !== "drawPile" && move.from !== "discardPile") return null;
      return { type: move.type, seat, from: move.from };
    case "switch":
    case "stack":
      if (!isIndex(move.handIndex)) return null;
      return {type: move.type, seat, handIndex: move.handIndex };
    case "jack": {
      const { seat1, seat2, i1, i2 } = move;
      if (!isIndex(seat1) || !isIndex(seat2) || !isIndex(i1) || !isIndex(i2)) return null; 
      return {type: "jack", seat, seat1, seat2, i1, i2 };
    }
    case "queen": {
      const { targetSeat, handIndex } = move;
      if (!isIndex(targetSeat) || !isIndex(handIndex)) return null;
      return { type: "queen", seat, targetSeat, handIndex };
    }
    default:
      return null;
  }
}

export { viewFor } from "./view.ts";
export { initGameState } from "./gameState.ts";
export type {
  GameState,
  GameResult,
  Move,
  Action,
  RoundScore,
  Card,
  Suit,
  Phase,
  PlayerView,
  SeatView,
  PeekView,
  ViewResult,
} from "./types.ts";

// ======= Helper Functions ==========
function isIndex(x: unknown): x is number {
  return Number.isInteger(x) && (x as number) >= 0;
}
