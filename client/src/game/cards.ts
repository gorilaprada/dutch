import type { Card, Suit } from "./protocol.ts";

const RANKS: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };

export function rankLabel(value: number): string {
  return RANKS[value] ?? String(value);
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "♡" || suit === "♢";
}

// Jack and Queen: discarding one gives a power, they glow cyan face up
export function isPowerCard(card: Card): boolean {
  return card.value === 11 || card.value === 12;
}

export function cardLabel(card: Card): string {
  return `${rankLabel(card.value)}${card.suit}`;
}
