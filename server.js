import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import GameState from './lib/GameState.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer)

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL;

// Serving HTML
app.use(express.static('public'));

// Listening
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('server is running')
  console.log(`access server at ${SERVER_URL}:${PORT}`)
})

// Game control
const game = new GameState();
console.log(game.deck.deck.length);

// Socket.io Logic
io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      socket.emit("error", "Invalid name");
      return;
    }
    const player = game.addPlayer(socket.id, data.name)

    if (player.error) {
      socket.emit('error', player.error);
    } else {
      const playersList = Array.from(game.players.values());
      io.emit('updatePlayersList', playersList);
    }
  })

  socket.on('disconnect', () => {
    // Get player who is disconnected
    const player = game.players.get(socket.id);

    if (player) {
      // Reset their drawn card
      player.drawnCard = null;

      // Cancel their pending power if they had one
      if (game.pendingPower?.owner === socket.id) {
        game.pendingPower = null;
        game.phase = "drawing";
      }

      // If it's their turn, skip to next player
      if (game.playerOrder[game.turnIndex] === socket.id) {
        game.turnIndex = (game.turnIndex + 1) % game.playerOrder.length;
      }

      //Remove them from the game
      game.players.delete(socket.id);

      // Broadcast updated player list to everyone
      io.emit('updatePlayerList', Array.from(game.players.values()));
    }
  })
})

