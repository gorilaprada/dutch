export default class Deck {
  constructor() {
    this.deck = []
    this.suits = ["hearts", "diamonds", "clubs", "spades"]
  }

  build() {
    for (const suit of this.suits) {
      for (let value = 1; value < 14; value++) {
        this.deck.push({
          id: `${suit}_${value}`,
          suit: suit,
          value: value,
          isFaceUp: false
        });
      }
    }
  }

  shuffle() {
    for (let card = this.deck.length - 1; card >= 1; card--) {
      const j = Math.floor(Math.random() * (card + 1));
      [this.deck[card], this.deck[j]] = [this.deck[j], this.deck[card]];
    }
  }

  dealHand() {
    return this.deck.splice(-4)
  }

}
