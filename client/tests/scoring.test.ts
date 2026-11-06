import { describe, expect, test } from "vitest";
import { handTotal } from "../src/game/scoring.ts";
import { card } from "./fixtures.ts";

describe("handTotal", () => {
  test("adds the lib's card points: black kings count 0", () => {
    expect(handTotal([card("♤", 13), card("♡", 13), card("♢", 7), card("♧", 1)])).toBe(21);
    expect(handTotal([])).toBe(0);
    expect(handTotal([null, card("♧", 13)])).toBe(0);
  });
});
