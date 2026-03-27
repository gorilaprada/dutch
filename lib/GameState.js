import Player from './Player.js'
import Deck from './Deck.js'

export default class GameState {
  constructor() {
    this.deck = new Deck();
    this.players = new Map();
    this.discardPile = [];
    this.state = "waiting";
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
  distributeCards() {
    const playerKeys = Object.keys(this.players)
    playerKeys.forEach(value => {
      this.players[value].hand = this.deck.splice(0, 4)
    })
  }


};
