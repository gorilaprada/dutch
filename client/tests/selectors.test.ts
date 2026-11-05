import { describe, expect, test } from "vitest";
import { isMyTurn, isSpectator, nameOf, seatsAroundTable } from "../src/game/selectors.ts";
import { roomView, seat } from "./fixtures.ts";

const positions = (players: ReturnType<typeof seat>[], you: number | null) =>
  seatsAroundTable(players, you).map(({ player, position }) => `${player.seat}:${position}`);

describe("seatsAroundTable", () => {
  test("puts me at the bottom and the others in turn order", () => {
    expect(positions([seat(0), seat(1)], 0)).toEqual(["0:self", "1:top"]);
    expect(positions([seat(0), seat(1), seat(2)], 1)).toEqual(["1:self", "2:left", "0:right"]);
    expect(positions([seat(0), seat(1), seat(2), seat(3)], 2)).toEqual(["2:self", "3:left", "0:top", "1:right"]);
  });

  test("handles gaps in the seats", () => {
    expect(positions([seat(0), seat(2), seat(3)], 3)).toEqual(["3:self", "0:left", "2:right"]);
  });

  test("a spectator leaves the bottom empty", () => {
    expect(positions([seat(0), seat(1)], null)).toEqual(["0:left", "1:right"]);
    expect(positions([seat(0), seat(1), seat(2)], null)).toEqual(["0:left", "1:top", "2:right"]);
  });
});

describe("selectors", () => {
  test("whose turn and who is watching", () => {
    expect(isMyTurn(roomView({ phase: "drawing" }))).toBe(true);
    expect(isMyTurn(roomView({ phase: "drawing", you: 1 }))).toBe(false);
    expect(isSpectator(roomView({ you: null }))).toBe(true);
    expect(isMyTurn(roomView({ you: null }))).toBe(false);
  });

  test("nameOf falls back to the seat number", () => {
    expect(nameOf(roomView(), 1)).toBe("Bob");
    expect(nameOf(roomView({ names: {} }), 2)).toBe("Seat 3");
  });
});
