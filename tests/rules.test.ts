import { describe, expect, test } from "vitest";
import { countPoints } from "../src/gameState.ts";
import { discardCard } from "../src/moves.ts";
import { viewFor } from "../src/view.ts";
import type { GameState, PlayerView, ViewResult } from "../src/types.ts";
import {
  random,
  card,
  unwrap,
  setHand,
  setDiscard,
  memorizing,
  playing,
} from "./helpers.ts";

function view(result: ViewResult): PlayerView {
  if (!result.ok) throw new Error(result.error);
  return result.view;
}

describe("first discard", () => {
  test("startGame flips one card onto the discard pile", () => {
    const state = memorizing();
    expect(state.deck.discardPile.length).toBe(1);
    expect(state.deck.drawPile.length).toBe(52 - 2 * 4 - 1);
  });
});

describe("discarding a drawn card", () => {
  test("a drawn Jack gives its power and is not treated as a stack", () => {
    // Top discard is also a Jack: still a plain discard, stacking stays open
    const state = setDiscard(playing(), [card("♡", 11)]);
    const players = new Map(state.players);
    players.set(0, { ...players.get(0)!, drawnCard: card("♤", 11) });
    const deciding: GameState = { ...state, players, phase: "deciding" };

    const next = unwrap(discardCard(deciding, 0));
    expect(next.phase).toBe("power_jack");
    expect(next.turnIndex).toBe(0);
    expect(next.canStack).toBe(true);
    expect(next.players.get(0)!.hand.length).toBe(4);
  });
});

describe("next round", () => {
  // Hands set so both players survive: seat 0 loses 2, seat 1 loses 10
  function scoring(): GameState {
    let state = playing();
    state = setHand(state, 0, [card("♡", 2)]);
    state = setHand(state, 1, [card("♡", 10)]);
    return { ...state, phase: "scoring", dutch: { seat: 0 } };
  }

  test("is dealt right away and goes to memorizing", () => {
    const next = unwrap(countPoints(scoring(), random));

    expect(next.phase).toBe("memorizing");
    expect(next.players.get(0)!.hand.length).toBe(4);
    expect(next.players.get(1)!.hand.length).toBe(4);
    expect(next.deck.discardPile.length).toBe(1);
    expect(next.dutch).toBeNull();
    expect(next.players.get(0)!.score).toBe(48);
    expect(next.players.get(1)!.score).toBe(40);
  });

  test("the round winner (fewest points lost) starts", () => {
    // Seat 0: 50 - 2 = 48, seat 1: 50 - 10 = 40
    const next = unwrap(countPoints(scoring(), random));
    expect(next.turnIndex).toBe(0);
  });

  test("the round winner starts even with the lower total score", () => {
    // Seat 0: 20 - 2 = 18, seat 1: 50 - 10 = 40. Seat 0 won the round
    const base = scoring();
    const players = new Map(base.players);
    players.set(0, { ...players.get(0)!, score: 20 });
    const next = unwrap(countPoints({ ...base, players }, random));
    expect(next.turnIndex).toBe(0);
  });

  test("a tie on points lost goes to the lowest seat", () => {
    // Both lose 10. Seat 0: 30 - 10 = 20, seat 1: 50 - 10 = 40
    const tied = setHand(scoring(), 0, [card("♢", 10)]);
    const players = new Map(tied.players);
    players.set(0, { ...players.get(0)!, score: 30 });
    const next = unwrap(countPoints({ ...tied, players }, random));
    expect(next.turnIndex).toBe(0);
  });

  test("the game finishes when one player is left", () => {
    // Seat 1 loses 50 points: 13 + 13 + 12 + 12 (red kings count)
    const state = setHand(scoring(), 1, [card("♡", 13), card("♢", 13), card("♡", 12), card("♢", 12)]);
    const next = unwrap(countPoints(state, random));

    expect(next.phase).toBe("finished");
    expect([...next.players.keys()]).toEqual([0]);
    expect(next.players.get(0)!.hand).toEqual([]);
  });
});

describe("spectator view", () => {
  test("a spectator sees no card during play or memorizing", () => {
    for (const state of [playing(), memorizing()]) {
      const v = view(viewFor(state, null));
      expect(v.you).toBeNull();
      for (const seatView of v.players) {
        expect(seatView.hand.every(c => c === null)).toBe(true);
      }
    }
  });

  test("a spectator sees the reveal during scoring", () => {
    const state: GameState = { ...playing(), phase: "scoring" };
    const v = view(viewFor(state, null));
    expect(v.players[0]!.hand).toEqual(state.players.get(0)!.hand);
  });
});
