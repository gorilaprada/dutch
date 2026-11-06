// The one runtime import from the lib: scoring has a single source of truth.
// Only cardPoints is used, so the bundler leaves the rest of the lib out
import { cardPoints } from "../../../src/entrypoint.ts";
import type { Card } from "./protocol.ts";

export { cardPoints };

// Points in a revealed hand (scoring shows every card, so none is null)
export function handTotal(hand: readonly (Card | null)[]): number {
  return hand.reduce((total, card) => total + (card ? cardPoints(card) : 0), 0);
}
