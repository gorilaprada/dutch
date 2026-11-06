import { describe, expect, test, beforeEach } from "vitest";
import { initPlayer, addCards, addDrawnCard, cardPoints } from "../src/player.js";
import type { Card, Player } from "../src/types.ts";

describe("Player", () => {
  let player: Player;
  let mockCards: Card[];

  // Re-instantiate the player and mock cards before each test
  beforeEach(() => {
    player = initPlayer(0); //
    mockCards = [
      { id: "♤_1", suit: "♤", value: 1 },
      { id: "♡_13", suit: "♡", value: 13 },
      { id: "♢_5", suit: "♢", value: 5 },
      { id: "♧_7", suit: "♧", value: 7 }
    ];
  });

  test("initializes with the correct defaults and constructor arguments", () => {
    expect(player.seat).toBe(0);
    expect(player.hand).toEqual([]);
    expect(player.drawnCard).toBeNull();
    expect(player.score).toBe(50);
    expect(player.isReady).toBe(false);
  });

  test("addCards() concatenates new cards to the player's hand", () => {
    const newPlayer = addCards(player, mockCards.slice(0, 2));
    expect(newPlayer.hand.length).toBe(2);

    const newPlayer2 = addCards(newPlayer, mockCards.slice(2, 4));
    expect(newPlayer2.hand.length).toBe(4);
    expect(newPlayer2.hand).toEqual(mockCards);
  });

  test("addToDrawnCard() successfully sets the drawnCard property", () => {
    const drawn: Card = { id: "♤_10", suit: "♤", value: 10 };
    const newPlayer = addDrawnCard(player, drawn);

    expect(newPlayer.drawnCard).toEqual(drawn);
  });
});

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
