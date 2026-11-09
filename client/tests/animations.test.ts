import { describe, expect, test } from "vitest";
import { animationsFor, DEAL_STAGGER_MS, DRAW_MS, SHAKE_MS, slotKey, type Animation } from "../src/game/animations.ts";
import type { Action, PlayerView } from "../src/game/protocol.ts";
import { card, seat, tableView } from "./fixtures.ts";

const base = tableView().view;

// The step from base to the view after `action`
function step(action: Action, overrides: Partial<PlayerView> = {}): Animation[] {
  return animationsFor(base, { ...base, ...overrides, lastAction: action, actionSeq: base.actionSeq + 1 });
}

describe("animationsFor", () => {
  test("only animates one action apart", () => {
    const action: Action = { type: "discard", seat: 0, discarded: card("♡", 5) };
    expect(animationsFor(null, { ...base, lastAction: action, actionSeq: 2 })).toEqual([]);
    expect(animationsFor(base, { ...base, lastAction: action, actionSeq: base.actionSeq })).toEqual([]);
    expect(animationsFor(base, { ...base, lastAction: action, actionSeq: base.actionSeq + 2 })).toEqual([]);
  });

  test("draw: from the deck face down, from the discard pile face up, both quicker", () => {
    expect(step({ type: "draw", seat: 1, from: "drawPile" })).toEqual([
      { kind: "fly", from: { kind: "deck" }, to: { kind: "drawn" }, card: null, delay: 0, duration: DRAW_MS },
    ]);
    expect(step({ type: "draw", seat: 1, from: "discardPile", card: card("♧", 7) })).toEqual([
      { kind: "fly", from: { kind: "discard" }, to: { kind: "drawn" }, card: card("♧", 7), delay: 0, duration: DRAW_MS },
    ]);
  });

  test("switch: the drawn card into the hand, the old card onto the pile", () => {
    expect(step({ type: "switch", seat: 0, handIndex: 2, discarded: card("♢", 9) })).toEqual([
      { kind: "fly", from: { kind: "drawn" }, to: { kind: "hand", seat: 0, handIndex: 2 }, card: null, delay: 0 },
      { kind: "fly", from: { kind: "hand", seat: 0, handIndex: 2 }, to: { kind: "discard" }, card: card("♢", 9), delay: 0 },
    ]);
  });

  test("discard: the drawn card onto the pile", () => {
    expect(step({ type: "discard", seat: 0, discarded: card("♤", 12) })).toEqual([
      { kind: "fly", from: { kind: "drawn" }, to: { kind: "discard" }, card: card("♤", 12), delay: 0 },
    ]);
  });

  test("stack: a right one flies to the pile", () => {
    expect(step({ type: "stack", seat: 1, handIndex: 3, card: card("♡", 5), success: true })).toEqual([
      { kind: "fly", from: { kind: "hand", seat: 1, handIndex: 3 }, to: { kind: "discard" }, card: card("♡", 5), delay: 0 },
    ]);
  });

  test("stack: a wrong one shakes, then the penalty lands at the end of the hand", () => {
    const players = [seat(0, { hand: [null, null, null, null] }), seat(1, { hand: [null, null, null, null, null] })];
    expect(step({ type: "stack", seat: 1, handIndex: 0, card: card("♧", 2), success: false }, { players })).toEqual([
      { kind: "shake", at: { kind: "hand", seat: 1, handIndex: 0 } },
      { kind: "fly", from: { kind: "deck" }, to: { kind: "hand", seat: 1, handIndex: 4 }, card: null, delay: SHAKE_MS, tone: "penalty" },
    ]);
  });

  test("jack: the two cards cross, in the power tone", () => {
    const a = { kind: "hand", seat: 0, handIndex: 1 } as const;
    const b = { kind: "hand", seat: 1, handIndex: 3 } as const;
    expect(step({ type: "jack", seat: 0, seat1: 0, i1: 1, seat2: 1, i2: 3 })).toEqual([
      { kind: "fly", from: a, to: b, card: null, delay: 0, tone: "power" },
      { kind: "fly", from: b, to: a, card: null, delay: 0, tone: "power" },
    ]);
  });

  test("queen: the target card lifts", () => {
    expect(step({ type: "queen", seat: 0, targetSeat: 1, handIndex: 2 })).toEqual([
      { kind: "lift", at: { kind: "hand", seat: 1, handIndex: 2 } },
    ]);
  });

  test("start deals one card at a time around the table", () => {
    const flights = step({ type: "start" }, { phase: "memorizing" });
    expect(flights).toHaveLength(8);
    const targets = flights.map(flight => (flight.kind === "fly" ? slotKey(flight.to) : ""));
    expect(targets.slice(0, 4)).toEqual(["hand-0-0", "hand-1-0", "hand-0-1", "hand-1-1"]);
    expect(flights.map(flight => (flight.kind === "fly" ? flight.delay : -1))).toEqual(
      Array.from({ length: 8 }, (_, i) => i * DEAL_STAGGER_MS),
    );
  });

  test("countPoints deals only when the next round started", () => {
    const summary = [{ seat: 0, pointsLost: 3, score: 47, eliminated: false }];
    expect(step({ type: "countPoints", summary }, { phase: "memorizing" })).toHaveLength(8);
    expect(step({ type: "countPoints", summary }, { phase: "finished" })).toEqual([]);
  });

  test("actions without movement animate nothing here", () => {
    expect(step({ type: "dutch", seat: 0 })).toEqual([]);
    expect(step({ type: "endMemorizing" })).toEqual([]);
    expect(step({ type: "endPeek", seat: 0 })).toEqual([]);
  });
});
