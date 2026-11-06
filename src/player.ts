import type { Player, Card } from "./types.ts";

const STARTING_SCORE = 50;

export function initPlayer(seat: number): Player {
  return {
    seat,
    hand: [],
    drawnCard: null,
    score: STARTING_SCORE,
    isReady: false,
  };
}

export function addCards(player: Player, cards: readonly Card[]): Player {
  return {
    ...player,
    hand: [...player.hand, ...cards],
  };
}

export function removeCard(player: Player, handIndex: number): Player {
  const newHand = [...player.hand];
  newHand.splice(handIndex, 1);
  return {
    ...player,
    hand: newHand,
  };
}

export function switchDrawnToHand(player: Player, handIndex: number): Player {
  if (!player.drawnCard) {
    throw new Error("Player has not drawn a Card");
  }

  const newHand = [...player.hand];
  newHand[handIndex] = player.drawnCard;
  return {
    ...player,
    hand: newHand,
  };
}

export function addDrawnCard(player: Player, card: Card): Player {
  if (player.drawnCard) {
    throw new Error("Player has already drawn a Card");
  }

  return {
    ...player,
    drawnCard: card,
  };
}

export function removeDrawnCard(player: Player): Player {
  return {
    ...player,
    drawnCard: null,
  };
}

export function ready(player: Player): Player {
  if (player.isReady) return player;

  return {
    ...player,
    isReady: true,
  };
}

export function score(player: Player): Player {
  const value = player.hand.reduce(
    (acc, card) =>
      acc + cardPoints(card),
    0);

  return {
    ...player,
    score: player.score - value,
  };
}

//=============== Helper functions ===================
// Black kings count 0, every other card its value (exported: the client shows hand totals)
export function cardPoints(card: Card): number {
  if (card.value === 13 && (card.suit === "♤" || card.suit === "♧")) return 0;
  return card.value;
}
