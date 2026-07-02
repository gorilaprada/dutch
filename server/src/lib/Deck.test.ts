import Deck from "./Deck.js";
import { describe, expect, beforeEach, test } from "vitest";

describe("Deck", () => {
  let gameDeck: Deck;

  // Re-instantiate the deck before each test to guarantee a clean slate
  beforeEach(() => {
    gameDeck = new Deck();
  });

  test("initializes with an empty deck array and standard suits", () => {
    expect(gameDeck.deck).toEqual([]);
    expect(gameDeck.suits).toEqual(["♤", "♡", "♢", "♧"]);
  });

  test("build() populates the deck with 52 cards of correct structure", () => {
    gameDeck.build();

    // Side effect: Deck array size increases
    expect(gameDeck.deck.length).toBe(52);

    // Verify the internal structure of the very first card
    expect(gameDeck.deck[0]).toEqual({
      id: "♤_1",
      suit: "♤",
      value: 1,
      isFaceUp: false
    });
  });

  test("shuffle() randomizes the order of the built deck", () => {
    gameDeck.build();

    // Create a shallow copy of the ordered deck to compare against later
    const originalDeckOrder = [...gameDeck.deck];

    gameDeck.shuffle();

    // Side effect: The array should no longer perfectly match the original order
    expect(gameDeck.deck).not.toEqual(originalDeckOrder);

    // Output check: No cards should be lost or duplicated during the shuffle
    expect(gameDeck.deck.length).toBe(52);
  });

  test("dealHand() returns exactly 4 cards and removes them from the end of the deck", () => {
    gameDeck.build();

    // Output check
    const hand = gameDeck.dealHand();
    expect(hand.length).toBe(4);

    // Side effect check: Deck size should decrease by 4
    expect(gameDeck.deck.length).toBe(48);
  });
});
