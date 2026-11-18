import { describe, expect, test } from "vitest";
import { cardPoints } from "../src/player.js";

describe("cardPoints", () => {
  test("black kings count 0, red kings 13, other cards their value", () => {
    expect(cardPoints({ id: "♤_13", suit: "♤", value: 13 })).toBe(0);
    expect(cardPoints({ id: "♧_13", suit: "♧", value: 13 })).toBe(0);
    expect(cardPoints({ id: "♡_13", suit: "♡", value: 13 })).toBe(13);
    expect(cardPoints({ id: "♢_13", suit: "♢", value: 13 })).toBe(13);
    expect(cardPoints({ id: "♤_1", suit: "♤", value: 1 })).toBe(1);
    expect(cardPoints({ id: "♧_12", suit: "♧", value: 12 })).toBe(12);
  });
});
