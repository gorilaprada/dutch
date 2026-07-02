import type { Card } from "./types.ts";

export default class Player {
  hand: Card[] = [];
  drawnCard: Card | null = null;
  score: number = 0;
  isReady: boolean = false;

  constructor(
    public id: string,
    public name: string
  ) { }

  addCards(cards: Card[]): void {
    this.hand = this.hand.concat(cards);
  }

  addToDrawnCard(card: Card): void {
    this.drawnCard = card;
  }

  setCardVisibility(indices: number[], visibility: boolean): void {
    indices.forEach((index: number): void => {
      if (this.hand[index]) {
        this.hand[index].isFaceUp = visibility;
      }
    })
  }

  hideAllCards(): void {
    this.hand.forEach((card: Card): void => {
      card.isFaceUp = false
    })
  }
}

