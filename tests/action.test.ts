import { describe, expect, test, beforeEach } from "vitest";
import {
  initGameState,
  addPlayer,
  setPlayerReady,
  removePlayer,
  startGame,
  endMemorizing,
  endPeek,
  countPoints,
} from "../src/gameState.ts";
import {
  drawFrom,
  switchCards,
  discardCard,
  stack,
  jackPower,
  queenPower,
  dutch,
} from "../src/moves.ts";
import type { GameState } from "../src/types.ts";
import { random, card, unwrap, setHand, setDiscard, playing } from "./helpers.ts";

describe("lastAction", () => {
  let state: GameState;

  beforeEach(() => {
    state = playing();
  });

  test("initGameState starts with no action", () => {
    const fresh = initGameState(random);
    expect(fresh.lastAction).toBeNull();
    expect(fresh.actionSeq).toBe(0);
  });

  test("lobby actions record the seat and increase actionSeq", () => {
    let lobby = initGameState(random);
    lobby = unwrap(addPlayer(lobby));
    expect(lobby.lastAction).toEqual({ type: "join", seat: 0 });
    expect(lobby.actionSeq).toBe(1);

    lobby = unwrap(addPlayer(lobby));
    expect(lobby.lastAction).toEqual({ type: "join", seat: 1 });

    lobby = unwrap(setPlayerReady(lobby, 1));
    expect(lobby.lastAction).toEqual({ type: "ready", seat: 1 });
    expect(lobby.actionSeq).toBe(3);
  });

  test("start and endMemorizing are recorded", () => {
    let lobby = initGameState(random);
    lobby = unwrap(addPlayer(lobby));
    lobby = unwrap(addPlayer(lobby));
    lobby = unwrap(setPlayerReady(lobby, 0));
    lobby = unwrap(setPlayerReady(lobby, 1));

    const started = unwrap(startGame(lobby, random));
    expect(started.lastAction).toEqual({ type: "start" });

    const drawing = unwrap(endMemorizing(started));
    expect(drawing.lastAction).toEqual({ type: "endMemorizing" });
    expect(drawing.actionSeq).toBe(started.actionSeq + 1);
  });

  test("drawing from the draw pile keeps the card secret", () => {
    const next = unwrap(drawFrom(state, 0, "drawPile", random));
    expect(next.lastAction).toEqual({ type: "draw", seat: 0, from: "drawPile" });
    expect(next.lastAction).not.toHaveProperty("card");
  });

  test("drawing from the discard pile shows the card", () => {
    const top = card("♡", 5);
    const next = unwrap(drawFrom(setDiscard(state, [top]), 0, "discardPile", random));
    expect(next.lastAction).toEqual({ type: "draw", seat: 0, from: "discardPile", card: top });
  });

  test("discard records the discarded card", () => {
    const drawn = unwrap(drawFrom(state, 0, "drawPile", random));
    const drawnCard = drawn.players.get(0)!.drawnCard!;

    const next = unwrap(discardCard(drawn, 0));
    expect(next.lastAction).toEqual({ type: "discard", seat: 0, discarded: drawnCard });
  });

  test("switch records the hand index and the discarded hand card", () => {
    const drawn = unwrap(drawFrom(state, 0, "drawPile", random));
    const handCard = drawn.players.get(0)!.hand[2]!;

    const next = unwrap(switchCards(drawn, 0, 2));
    expect(next.lastAction).toEqual({ type: "switch", seat: 0, handIndex: 2, discarded: handCard });
  });

  test("a correct stack is recorded as a success", () => {
    const five = card("♢", 5);
    const ready = setHand(setDiscard(state, [card("♡", 5)]), 1, [five, card("♧", 2)]);

    const next = unwrap(stack(ready, 1, 0, random));
    expect(next.lastAction).toEqual({ type: "stack", seat: 1, handIndex: 0, card: five, success: true });
  });

  test("a wrong stack reveals the attempted card", () => {
    const seven = card("♢", 7);
    const ready = setHand(setDiscard(state, [card("♡", 5)]), 1, [seven, card("♧", 2)]);

    const next = unwrap(stack(ready, 1, 0, random));
    expect(next.lastAction).toEqual({ type: "stack", seat: 1, handIndex: 0, card: seven, success: false });
    expect(next.players.get(1)!.hand.length).toBe(3);
  });

  test("stacking the last card is recorded and goes to scoring", () => {
    const five = card("♢", 5);
    const ready = setHand(setDiscard(state, [card("♡", 5)]), 1, [five]);

    const next = unwrap(stack(ready, 1, 0, random));
    expect(next.phase).toBe("scoring");
    expect(next.lastAction).toEqual({ type: "stack", seat: 1, handIndex: 0, card: five, success: true });
  });

  test("jack records both swapped slots", () => {
    const jackTime: GameState = { ...state, phase: "power_jack" };

    const next = unwrap(jackPower(jackTime, 0, 0, 1, 1, 3));
    expect(next.lastAction).toEqual({ type: "jack", seat: 0, seat1: 0, i1: 1, seat2: 1, i2: 3 });
  });

  test("queen records the target without the card, endPeek records the peeker", () => {
    const queenTime: GameState = { ...state, phase: "power_queen" };

    const peeking = unwrap(queenPower(queenTime, 0, 1, 2));
    expect(peeking.lastAction).toEqual({ type: "queen", seat: 0, targetSeat: 1, handIndex: 2 });

    const next = unwrap(endPeek(peeking));
    expect(next.lastAction).toEqual({ type: "endPeek", seat: 0 });
  });

  test("dutch and leave are recorded", () => {
    const called = unwrap(dutch(state, 0));
    expect(called.lastAction).toEqual({ type: "dutch", seat: 0 });

    const left = unwrap(removePlayer(called, 1));
    expect(left.lastAction).toEqual({ type: "leave", seat: 1 });
  });

  test("countPoints keeps counting actionSeq across rounds", () => {
    const scoring: GameState = { ...state, phase: "scoring" };

    const next = unwrap(countPoints(scoring, random));
    expect(next.lastAction?.type).toBe("countPoints");
    expect(next.actionSeq).toBe(scoring.actionSeq + 1);
  });
});
