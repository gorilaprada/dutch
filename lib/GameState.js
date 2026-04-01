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

  // Handling Deck
  instanciateDeck() {
    this.deck.build();
    this.deck.shuffle();
  }

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

  // Game Methods
  cardMemorization() {
    const players = Array.from(this.players.values())
    console.log("Card memorization start...")

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
      console.log("Momorization phase ended");
    }, 5000)
  }

  startGame() {
    this.playerOrder = Array.from(this.players.keys());
  }

};
