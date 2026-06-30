export default class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.drawnCard = null;
    this.score = 0;
    this.isReady = false;
  }

  addCards(cards) {
    this.hand = this.hand.concat(cards);
  }

  addToDrawnCard(card) {
    this.drawnCard = card;
  }

  setCardVisibility(indices, visibility) {
    indices.forEach(index => {
      if (this.hand[index]) {
        this.hand[index].isFaceUp = visibility;
      }
    })
  }

  hideAllCards() {
    this.hand.forEach(card => {
      card.isFaceUp = false
    })
  }
}
