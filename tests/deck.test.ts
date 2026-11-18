import {
  buildDeck,
  shuffleDrawPile,
  dealCards,
  addToDiscardPile,
} from "../src/deck.ts";
import type { Deck } from "../src/types.ts";
import { describe, expect, beforeEach, test } from "vitest";

describe("Deck", () => {
  let gameDeck: Deck;

  // Re-instantiate the deck before each test to guarantee a clean slate
  beforeEach(() => {
    gameDeck = buildDeck();
  });

  test("buildDeck() return a deck with 52 cards of correct structure", () => {
    // Deck has 52 cards
    expect(gameDeck.drawPile.length).toBe(52);
    // Deck has 52 different card id's
    expect(new Set(gameDeck.drawPile
      .map((card) => card.id))
      .size
    ).toBe(52);
    // Deck's first card is Ace of Spade
    expect(gameDeck.drawPile[0]).toEqual({
      id: "♤_1",
      suit: "♤",
      value: 1,
    });
    // Deck discardPile is an empty Array
    expect(gameDeck.discardPile).toEqual([]);
  });

  test("shuffleDrawPile() randomizes the order of the built deck", () => {
    const shuffledDeck = shuffleDrawPile(gameDeck, Math.random);

    expect(shuffledDeck.drawPile).not.toEqual(gameDeck.drawPile);
    expect(shuffledDeck.drawPile.length).toBe(52);
  });

  test("shuffleDrawPile() with random = 1 throws Error", () => {
    expect(() => shuffleDrawPile(gameDeck, () => 1)).toThrow("random() out of range");
  });

  test("dealCards() returns exactly 4 cards and removes them from the end of the deck", () => {
    const result = dealCards(gameDeck, 4);
    if (!result) throw new Error("expected a result");
    expect(result.dealtCards.length).toBe(4);
    expect(result.deck.drawPile.length).toBe(48);
    expect(result.dealtCards).toEqual(gameDeck.drawPile.slice(-4));
  });

  test("dealCards reshuffles automatically", () => {
    // Setting all the cards in discardPile
    const result = dealCards(gameDeck, 49, () => 0);
    if (!result) throw new Error("expected a result");
    const newDeck = result.dealtCards.reduce(
      (deck, card) => addToDiscardPile(deck, card),
      result.deck,
    );

    expect(newDeck.discardPile.length).toBe(49);
    expect(newDeck.drawPile.length).toBe(3);

    const result2 = dealCards(newDeck, 4, () => 0);
    if (!result2) throw new Error("expected a result");

    expect(result2.deck.drawPile.length).toBe(47);
    expect(result2.deck.discardPile.length).toBe(1);
    expect(result2.deck.discardPile.at(-1)).toEqual(newDeck.discardPile.at(-1));
    expect(result2.dealtCards.length).toBe(4);
  });
});
