import Player from './Player.js'
import Deck from './Deck.js'

export default class GameState {
  constructor() {
    this.deck = new Deck();
    this.discardPile = [];
    this.players = new Map();
    this.playerOrder = [];
    this.state = "waiting";
    this.phase = "drawing";
    this.pendingPower = null;
    this.canStack = true;
    this.turnIndex = 0;
    this.maxPlayers = 6;
  }

  // Handling Players
  addPlayer(socketId, name) {
    if (this.players.size >= this.maxPlayers) {
      return { error: "Lobby full" }
    };

    const newPlayer = new Player(socketId, name)
    this.players.set(socketId, newPlayer)
    return newPlayer
  }


  // Handling Deck
  dealCards() {
    const players = Array.from(this.players.values())

    players.forEach(player => {
      const hand = this.deck.dealHand();
      player.addCards(hand);

      // Testing
      // const handString = player.hand.map(card => card.id).join(", ");
      // console.log(`${player.name}'s hand is: ${handString || "Empty"}`);
    })
  }

  drawFromDeck(socketId) {
    const player = this.players.get(socketId);
    if (!player) { return { error: "Player not found" } }

    const activePlayerId = this.playerOrder[this.turnIndex];
    if (socketId !== activePlayerId) {
      return { error: "Not your turn!" }
    }

    const drawnCard = this.deck.deck.pop()
    player.addToDrawnCard(drawnCard);

    this.phase = "deciding";

    return { message: "Card drawn", card: drawnCard };
  }

  drawFromDiscard(socketId) {
    const player = this.players.get(socketId);
    if (!player) { return { error: "Player not found" } }

    const activePlayerId = this.playerOrder[this.turnIndex];
    if (socketId !== activePlayerId) {
      return { error: "Not your turn!" }
    }

    const drawnCard = this.discardPile.pop()
    player.addToDrawnCard(drawnCard);

    this.phase = "deciding";

    return { message: "Card drawn", card: drawnCard };
  }

  // Game Methods
  cardMemorization() {
    const players = Array.from(this.players.values())
    // console.log("Card memorization start...")

    players.forEach(player => {
      player.setCardVisibility([0, 1], true);

      // const handStatus = player.hand
      //   .map(card => card.isFaceUp ? card.id : "Not showing")
      //   .join(", ");
      // console.log(`${player.name} is memorizing these cards ${handStatus}`)
    })

    setTimeout(() => {
      players.forEach(player => {
        player.hideAllCards()
      })
      // console.log("Memorization phase ended");
    }, 5000)
  }

  initiateDiscardPile() {
    const firstCard = this.deck.deck.pop();
    firstCard.isFaceUp = true;

    this.discardPile.push(firstCard);

    // Test
    // console.log(`Dicard pile started with ${Object.values(this.discardPile)}`);
  }

  switchCards(socketId, handIndex) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, data: null, error: "Player not found" }
    if (!player.drawnCard) return { success: false, data: null, error: "No card drawn" }

    const activePlayerId = this.playerOrder[this.turnIndex];
    if (socketId !== activePlayerId) {
      return { success: false, data: null, error: "Not your turn!" }
    }

    if (this.phase !== "deciding") {
      return { success: false, data: null, error: "Cannot perform this action because of the phase of the game" }
    }

    const oldCard = player.hand[handIndex];

    player.hand[handIndex] = player.drawnCard;

    oldCard.isFaceUp = true;
    this.discardPile.push(oldCard);

    player.drawnCard = null;
    this.phase = "drawing";

    return { success: true, data: oldCard, error: null };
  }

  discardCard(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, data: null, error: "Player not found" }
    if (!player.drawnCard) return { success: false, data: null, error: "No card drawn" }

    const activePlayerId = this.playerOrder[this.turnIndex];
    if (socketId !== activePlayerId) {
      return { success: false, data: null, error: "Not your turn!" }
    }

    if (this.phase !== "deciding") {
      return { success: false, data: null, error: "Cannot perform this action because of the phase of the game" }
    }

    const discardCard = player.drawnCard;
    discardCard.isFaceUp = true;

    this.discardPile.push(discardCard);

    player.drawnCard = null;
    this.phase = "drawing";

    return { message: "Card discarded" };
  }

  stack(socketId, handIndex) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, error: "Player not found" }

    if (this.canStack === false) {
      const penaltyCard = this.deck.deck.pop()
      player.hand.push(penaltyCard);
      return { success: false, data: null, error: "Cannot discard, too slow!" }
    }

    const stackCard = player.hand[handIndex];
    const topDiscard = this.discardPile[this.discardPile.length - 1];

    if (!stackCard || !topDiscard) return { success: false, data: null, error: "Invalid Move" }

    if (stackCard.value === topDiscard.value) {
      stackCard.isFaceUp = true;
      this.discardPile.push(stackCard)

      player.hand.splice(handIndex, 1);

      this.canStack = false;

      return {
        success: true,
        data: { stackCard },
        error: null
      }
    } else {
      const penaltyCard = this.deck.deck.pop()
      player.hand.push(penaltyCard);
      return { success: false, data: null, error: "Cannot discard." }
    }
  }

  startGame() {
    this.playerOrder = Array.from(this.players.keys());
    this.deck.build();
    this.deck.shuffle();
    this.dealCards();
    this.initiateDiscardPile();
  }

};
