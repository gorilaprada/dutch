import { describe, expect, test } from "vitest";
import { viewFor } from "../src/view.ts";
import { drawFrom, queenPower } from "../src/moves.ts";
import type { GameState, PlayerView, ViewResult } from "../src/types.ts";
import { random, unwrap, memorizing, playing } from "./helpers.ts";

function view(result: ViewResult): PlayerView {
  if (!result.ok) throw new Error(result.error);
  return result.view;
}

describe("viewFor", () => {
  test("fails for a seat that is not in the game", () => {
    expect(viewFor(playing(), 3).ok).toBe(false);
  });

  test("other players' hands are face down but keep their length", () => {
    const v = view(viewFor(playing(), 0));
    const other = v.players.find(p => p.seat === 1)!;
    expect(other.hand).toEqual([null, null, null, null]);
  });

  test("own hand is face down during play", () => {
    const v = view(viewFor(playing(), 0));
    expect(v.players.find(p => p.seat === 0)!.hand).toEqual([null, null, null, null]);
  });

  test("while memorizing you only see your own cards at index 0 and 1", () => {
    const state = memorizing();
    const v = view(viewFor(state, 0));
    const own = state.players.get(0)!.hand;

    expect(v.players.find(p => p.seat === 0)!.hand).toEqual([own[0], own[1], null, null]);
    expect(v.players.find(p => p.seat === 1)!.hand).toEqual([null, null, null, null]);
  });

  test("every hand is revealed during scoring", () => {
    const state: GameState = { ...playing(), phase: "scoring" };
    const v = view(viewFor(state, 0));

    for (const seatView of v.players) {
      expect(seatView.hand).toEqual(state.players.get(seatView.seat)!.hand);
    }
  });

  test("drawn card is only visible to its owner", () => {
    const state = unwrap(drawFrom(playing(), 0, "drawPile", random));
    const drawn = state.players.get(0)!.drawnCard;

    const own = view(viewFor(state, 0)).players.find(p => p.seat === 0)!;
    expect(own.drawnCard).toEqual(drawn);
    expect(own.hasDrawnCard).toBe(true);

    const seenByOther = view(viewFor(state, 1)).players.find(p => p.seat === 0)!;
    expect(seenByOther.drawnCard).toBeNull();
    expect(seenByOther.hasDrawnCard).toBe(true);
  });

  test("peeked card is only visible to the peeker", () => {
    const queenTime: GameState = { ...playing(), phase: "power_queen" };
    const state = unwrap(queenPower(queenTime, 0, 1, 2));
    const target = state.players.get(1)!.hand[2];

    expect(view(viewFor(state, 0)).peek).toEqual({ peeker: 0, targetSeat: 1, handIndex: 2, card: target });
    expect(view(viewFor(state, 1)).peek).toEqual({ peeker: 0, targetSeat: 1, handIndex: 2, card: null });
  });

  test("players are sent as an array sorted by seat", () => {
    const v = view(viewFor(playing(), 1));
    expect(v.players.map(p => p.seat)).toEqual([0, 1]);
    expect(v.you).toBe(1);
  });

  test("draw pile is only a count", () => {
    const state = playing();
    const v = view(viewFor(state, 0));
    expect(v.drawPileCount).toBe(state.deck.drawPile.length);
  });

  test("the serialized view contains no hidden card id", () => {
    // Seat 0 holds a drawn card, seat 1 is looking
    const state = unwrap(drawFrom(playing(), 0, "drawPile", random));
    const json = JSON.stringify(view(viewFor(state, 1)));

    const hidden = [
      ...state.deck.drawPile,
      ...[...state.players.values()].flatMap(p => p.hand),
      state.players.get(0)!.drawnCard!,
    ];
    for (const card of hidden) {
      expect(json).not.toContain(card.id);
    }
  });
});
