import { describe, expect, test } from "vitest";
import { describeAction } from "../src/game/describe.ts";
import { card } from "./fixtures.ts";

const names: Record<number, string> = { 0: "Ana", 1: "Bob", 2: "Cat" };
const nameOf = (seat: number) => names[seat] ?? "?";
const say = (action: Parameters<typeof describeAction>[0], you: number | null = 0) => describeAction(action, nameOf, you);

describe("describeAction", () => {
  test("uses You for my own moves and names for others", () => {
    expect(say({ type: "draw", seat: 0, from: "drawPile" })).toBe("You drew from the deck");
    expect(say({ type: "draw", seat: 1, from: "drawPile" })).toBe("Bob drew from the deck");
    expect(say({ type: "ready", seat: 0 })).toBe("You are ready");
    expect(say({ type: "ready", seat: 1 })).toBe("Bob is ready");
  });

  test("shows the public cards", () => {
    expect(say({ type: "draw", seat: 1, from: "discardPile", card: card("♢", 7) })).toBe("Bob took 7♢ from the discard pile");
    expect(say({ type: "discard", seat: 1, discarded: card("♤", 12) })).toBe("Bob discarded Q♤");
    expect(say({ type: "switch", seat: 1, handIndex: 0, discarded: card("♧", 1) })).toBe("Bob switched card 1 and discarded A♧");
  });

  test("stacks, right and wrong", () => {
    expect(say({ type: "stack", seat: 0, handIndex: 1, card: card("♤", 13), success: true })).toBe("You stacked K♤");
    expect(say({ type: "stack", seat: 1, handIndex: 1, card: card("♢", 7), success: false })).toBe("Bob stacked 7♢: wrong, +1 card");
  });

  test("powers with 1-based card numbers", () => {
    expect(say({ type: "jack", seat: 2, seat1: 0, i1: 1, seat2: 1, i2: 0 })).toBe("Cat swapped your card 2 with Bob's card 1");
    expect(say({ type: "queen", seat: 0, targetSeat: 1, handIndex: 2 })).toBe("You peeked at Bob's card 3");
    expect(say({ type: "endPeek", seat: 1 })).toBe("Bob's peek is over");
  });

  test("the round", () => {
    expect(say(null)).toBeNull();
    expect(say({ type: "start" })).toBe("The cards are dealt");
    expect(say({ type: "endMemorizing" })).toBe("Cards face down: play!");
    expect(say({ type: "dutch", seat: 1 })).toBe("Bob called DUTCH");
    expect(say({ type: "countPoints", summary: [] })).toBe("Round scored");
  });

  test("a spectator sees names only", () => {
    expect(say({ type: "draw", seat: 0, from: "drawPile" }, null)).toBe("Ana drew from the deck");
  });

  test("the longest line fits the 95 characters the last-move CSS is sized for", () => {
    // Names are at most 20 characters (server rule); hands can grow past 9 cards with penalties
    const longName = () => "W".repeat(20);
    const line = describeAction({ type: "jack", seat: 2, seat1: 0, i1: 9, seat2: 1, i2: 9 }, longName, null);
    expect(line?.length).toBeLessThanOrEqual(95);
  });
});
