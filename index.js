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
    const player = game.addPlayer(socket.id, data.name)

    if (player.error) {
      socket.emit('error', player.error);
    } else {
      const playersList = Array.from(game.players.values());
      io.emit('updatePlayersList', playersList);
    }
  })
})

