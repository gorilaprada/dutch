import { describe, expect, test } from "vitest";
import { parseMove } from "../../src/entrypoint.ts";
import type { ClientEvents, ClientMove } from "../src/protocol.ts";
import type { ClientToServerEvents } from "../src/events.ts";

// Compile-time checks: `tsc` fails if any of these stop holding
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const sameEvents: Equal<keyof ClientEvents, keyof ClientToServerEvents> = true;

// @ts-expect-error server-only moves are not client moves
const serverOnly: ClientMove = { type: "countPoints" };
// @ts-expect-error the seat comes from the session, never the client
const withSeat: ClientMove = { type: "draw", seat: 0, from: "drawPile" };
// @ts-expect-error joining goes through joinRoom
const join: ClientMove = { type: "addPlayer" };

describe("protocol", () => {
  test("client and server declare the same events", () => {
    expect(sameEvents).toBe(true);
    expect([serverOnly, withSeat, join]).toHaveLength(3);
  });

  test("every kind of ClientMove is accepted by parseMove", () => {
    const moves: ClientMove[] = [
      { type: "ready" },
      { type: "start" },
      { type: "draw", from: "drawPile" },
      { type: "draw", from: "discardPile" },
      { type: "switch", handIndex: 0 },
      { type: "discard" },
      { type: "stack", handIndex: 3 },
      { type: "jack", seat1: 0, i1: 1, seat2: 1, i2: 2 },
      { type: "queen", targetSeat: 1, handIndex: 0 },
      { type: "dutch" },
      { type: "leave" },
    ];

    for (const move of moves) {
      const parsed = parseMove(move, 2);
      expect(parsed).toMatchObject(move);
      // Every move that acts for a player gets the session seat ("start" has none)
      if (parsed && "seat" in parsed) expect(parsed.seat).toBe(2);
    }
  });
});
