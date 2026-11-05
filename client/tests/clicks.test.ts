import { describe, expect, test } from "vitest";
import { cardClick, pileClick } from "../src/game/clicks.ts";
import { seat, tableView } from "./fixtures.ts";

const mine = { seat: 0, handIndex: 2 };
const bobs = { seat: 1, handIndex: 1 };

describe("cardClick", () => {
  test("nothing reacts while memorizing, peeking, scoring, finished, or for spectators", () => {
    for (const phase of ["memorizing", "peeking", "scoring", "finished", "lobby"] as const) {
      expect(cardClick(tableView({ phase }), mine, null, false)).toEqual({ kind: "none" });
    }
    expect(cardClick(tableView({ you: null }), bobs, null, false)).toEqual({ kind: "none" });
  });

  test("my Queen peeks at any card", () => {
    expect(cardClick(tableView({ phase: "power_queen" }), bobs, null, false))
      .toEqual({ kind: "move", move: { type: "queen", targetSeat: 1, handIndex: 1 } });
    expect(cardClick(tableView({ phase: "power_queen" }), mine, null, false))
      .toEqual({ kind: "move", move: { type: "queen", targetSeat: 0, handIndex: 2 } });
  });

  test("my Jack: pick, cancel, move the pick within a hand, swap across players", () => {
    const view = tableView({ phase: "power_jack" });
    expect(cardClick(view, mine, null, false)).toEqual({ kind: "pick", pick: mine });
    expect(cardClick(view, mine, mine, false)).toEqual({ kind: "pick", pick: null });
    expect(cardClick(view, { seat: 0, handIndex: 0 }, mine, false)).toEqual({ kind: "pick", pick: { seat: 0, handIndex: 0 } });
    expect(cardClick(view, bobs, mine, false))
      .toEqual({ kind: "move", move: { type: "jack", seat1: 0, i1: 2, seat2: 1, i2: 1 } });
    // Two other players' cards are fine too
    expect(cardClick(view, mine, bobs, false))
      .toEqual({ kind: "move", move: { type: "jack", seat1: 1, i1: 1, seat2: 0, i2: 2 } });
  });

  test("someone else's power: no clicks", () => {
    for (const phase of ["power_jack", "power_queen"] as const) {
      expect(cardClick(tableView({ phase, turnIndex: 1 }), mine, null, false)).toEqual({ kind: "none" });
    }
  });

  test("deciding: a click switches, the toggle makes it a stack", () => {
    const view = tableView({ phase: "deciding" });
    expect(cardClick(view, mine, null, false)).toEqual({ kind: "move", move: { type: "switch", handIndex: 2 } });
    expect(cardClick(view, mine, null, true)).toEqual({ kind: "move", move: { type: "stack", handIndex: 2 } });
  });

  test("not deciding: a click stacks, if stacking is open", () => {
    expect(cardClick(tableView({ turnIndex: 1 }), mine, null, false)).toEqual({ kind: "move", move: { type: "stack", handIndex: 2 } });
    expect(cardClick(tableView({ phase: "drawing" }), mine, null, false)).toEqual({ kind: "move", move: { type: "stack", handIndex: 2 } });
    expect(cardClick(tableView({ view: { canStack: false } }), mine, null, false)).toEqual({ kind: "none" });
  });

  test("other players' cards don't react outside powers", () => {
    expect(cardClick(tableView({ phase: "deciding" }), bobs, null, false)).toEqual({ kind: "none" });
    expect(cardClick(tableView({ turnIndex: 1 }), bobs, null, true)).toEqual({ kind: "none" });
  });
});

describe("pileClick", () => {
  test("draws only on my turn while drawing", () => {
    expect(pileClick(tableView(), "drawPile")).toEqual({ type: "draw", from: "drawPile" });
    expect(pileClick(tableView(), "discardPile")).toEqual({ type: "draw", from: "discardPile" });
    expect(pileClick(tableView({ turnIndex: 1 }), "drawPile")).toBeNull();
    expect(pileClick(tableView({ phase: "deciding" }), "drawPile")).toBeNull();
    expect(pileClick(tableView({ view: { topDiscard: null } }), "discardPile")).toBeNull();
    expect(pileClick(tableView({ you: null, players: [seat(0), seat(1)] }), "drawPile")).toBeNull();
  });
});
