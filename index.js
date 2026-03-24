import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer)

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL;
const __dirname = import.meta.dirname;


// Game State
class GameState {
  constructor() {
    this.deck = [];
    this.players = {};
      // Keys should be socket.id
      // player1: {
      //   name: 'Luke'
      //   hand: ['queenofhearts', 'card2', 'card3', 'card4']
      // }
    this.discardPile = [];
    this.state = "waiting";

    this.buildDeck()
    this.shuffleDeck()
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
};

const game = new GameState();
console.log(game.deck);

// Serving HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
})

// Socket.io Logic
io.on("connection", (socket) => {
  console.log("Someone is connected")
})

// Listening
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('server is running')
  console.log(`access server at ${SERVER_URL}:${PORT}`)
})
