import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer)

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL;


// Game State
class GameState {
  constructor() {
    this.deck = [];
    this.players = {
      // Keys should be socket.id
      player1: {
        name: 'Cranium',
        hand: []
      },
      player2: {
        name: 'Jo',
        hand: []
      }
    };
    this.discardPile = [];
    this.state = "waiting";

    this.buildDeck()
    this.shuffleDeck()
    console.log(this.deck.length)
    this.distributeCards()
    console.log(this.deck.length)
  }

  // Game helpers
  buildDeck() {
    const SUITS = ["hearts", "diamonds", "clubs", "spades"]
    for (const suit of SUITS) {
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

  shuffleDeck() {
    for (let card = this.deck.length - 1; card >= 1; card--) {
      const j = Math.floor(Math.random() * (card + 1));
      [this.deck[card], this.deck[j]] = [this.deck[j], this.deck[card]];
    }
  }

  distributeCards() {
    const playerKeys = Object.keys(this.players)
    playerKeys.forEach(value => {
      this.players[value].hand = this.deck.splice(0, 4)
    })
  }

  // startGame() {
  //   for (const player of this.players) {
  //
  //   }
  // }
};

const game = new GameState();

// Serving HTML
app.use(express.static('public'));

// Socket.io Logic
io.on("connect", (socket) => {
  console.log(socket.id)
})

// Listening
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('server is running')
  console.log(`access server at ${SERVER_URL}:${PORT}`)
})
