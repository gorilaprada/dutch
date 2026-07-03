import { describe, expect, test, beforeEach } from "vitest";
import Player from "./Player.js";
import type { Card } from "./types.ts";

describe("Player", () => {
  let player: Player;
  let mockCards: Card[];

  // Re-instantiate the player and mock cards before each test
  beforeEach(() => {
    player = new Player("player-123", "Alice"); //
    mockCards = [
      { id: "♤_1", suit: "♤", value: 1, isFaceUp: false },
      { id: "♡_13", suit: "♡", value: 13, isFaceUp: true },
      { id: "♢_5", suit: "♢", value: 5, isFaceUp: false },
      { id: "♧_7", suit: "♧", value: 7, isFaceUp: true }
    ];
  });

  test("initializes with the correct defaults and constructor arguments", () => {
    expect(player.id).toBe("player-123");
    expect(player.name).toBe("Alice");
    expect(player.hand).toEqual([]);
    expect(player.drawnCard).toBeNull();
    expect(player.score).toBe(0);
    expect(player.isReady).toBe(false);
  });

  test("addCards() concatenates new cards to the player's hand", () => {
    player.addCards(mockCards.slice(0, 2));
    expect(player.hand.length).toBe(2);

    player.addCards(mockCards.slice(2, 4)); expect(player.hand.length).toBe(4);
    expect(player.hand).toEqual(mockCards);
  });

  test("addToDrawnCard() successfully sets the drawnCard property", () => {
    const drawn: Card = { id: "♤_10", suit: "♤", value: 10, isFaceUp: false };

    player.addToDrawnCard(drawn);
    expect(player.drawnCard).toEqual(drawn);
  });

  test("setCardVisibility() updates the isFaceUp property of specified indices", () => {
    player.addCards(mockCards); //[cite: 3]

    // Test making cards visible (simulating the 5-second initial memorization phase)
    player.setCardVisibility([0, 2], true);

    expect(player.hand[0]!.isFaceUp).toBe(true);
    expect(player.hand[2]!.isFaceUp).toBe(true);

    // Ensure cards not specified in the indices array are unchanged
    expect(player.hand[1]!.isFaceUp).toBe(true); // Was already true in mock
  });

  test("setCardVisibility() safely ignores out-of-bounds indices", () => {
    player.addCards(mockCards);

    // Attempting to flip a card that doesn't exist shouldn't throw an error
    expect(() => player.setCardVisibility([99], true)).not.toThrow();
  });

  test("hideAllCards() sets isFaceUp to false for every card in the hand", () => {
    player.addCards(mockCards);

    // Verify our mock has some face-up cards to begin with
    expect(player.hand.some(card => card.isFaceUp)).toBe(true);

    player.hideAllCards();

    // Verify all are now hidden
    const allHidden = player.hand.every(card => card.isFaceUp === false);
    expect(allHidden).toBe(true);
  });
});
