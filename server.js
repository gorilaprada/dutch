import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import GameState from "./lib/GameState.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer)

// const PORT = process.env.PORT || 3000;
// const SERVER_URL = process.env.SERVER_URL;

// Serving HTML
app.use(express.static("public"));

// Listening
httpServer.listen(3000, "0.0.0.0", () => {
  console.log("server is running")
  // console.log(`access server at ${SERVER_URL}:${PORT}`)
})

const game = new GameState();

// Helper functions
function getScrubbedState(game) {
  return {
    discardTop: game.discardPile[game.discardPile.length - 1] || null,
    playerOrder: game.playerOrder,
    activePlayer: game.playerOrder[game.turnIndex],
    state: game.state,
    phase: game.phase,
    pendingPowerOwner: game.pendingPowerOwner,
    players: game.playerOrder.map(id => {
      const player = game.players.get(id);
      return {
        id: player.id,
        name: player.name,
        hand: player.hand.map(card => ({
          id: card.isFaceUp ? card.id : null,
          suit: card.isFaceUp ? card.suit : null,
          value: card.isFaceUp ? card.value : null,
          isFaceUp: card.isFaceUp,
        }))
      }
    })
  }
}

function emitUpdate() {
  io.emit("gameUpdated", { success: true, data: getScrubbedState(game), error: null });
};

// Socket.io Logic
io.on("connection", (socket) => {
  socket.on("joinGame", (data) => {
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      socket.emit("error", "Invalid name");
      return;
    }

    const player = game.addPlayer(socket.id, data.name)

    if (player.error) {
      socket.emit("error", player.error);
    } else {
      const playersList = Array.from(game.players.values());
      io.emit("updatePlayersList", playersList);
    }
  })

  socket.on("disconnect", () => {
    // Get player who is disconnected
    const player = game.players.get(socket.id);

    if (player) {
      // Reset their drawn card
      player.drawnCard = null;

      // Cancel their pending power if they had one
      if (game.pendingPowerOwner === socket.id) {
        game.pendingPowerOwner = null;
        game.phase = "drawing";
      }

      // If it"s their turn, skip to next player
      if (game.playerOrder[game.turnIndex] === socket.id) {
        game.turnIndex = (game.turnIndex + 1) % game.playerOrder.length;
      }

      //Remove them from the game
      game.players.delete(socket.id);

      // Broadcast updated player list to everyone
      io.emit("updatePlayerList", Array.from(game.players.values()));
    }
  })

  socket.on("startGame", () => {
    if (!game.playerOrder.length) {
      game.startGame();

      game.cardMemorization();
      emitUpdate();

      setTimeout(() => {
        const playersList = Array.from(game.players.values());
        playersList.forEach(player => player.hideAllCards());
        emitUpdate();
      }, 5000);
    }
  });

  socket.on("drawCard", (data) => {
    const result = game.drawFrom(socket.id, data.drawFrom);
    if (result.error) {
      socket.emit("error", result.error);
    } else {
      socket.emit("renderDrawnCard", {
        success: true,
        data: { card: result.data.card, discardTop: result.data.discardTop },
        error: null
      });
      emitUpdate();
    }
  });

  socket.on("discardCard", () => {
    const result = game.discardCard(socket.id);
    if (result.error) {
      socket.emit("error", result.error);
    } else {
      emitUpdate();
    }
  });

  socket.on("switchCards", (handIndex) => {
    const result = game.switchCards(socket.id, handIndex);
    if (result.error) {
      socket.emit("error", result.error);
    } else {
      emitUpdate();
    }
  });

  socket.on("queenPower", (data) => {
    const result = game.queenPower(socket.id, data.targetPlayerId, data.handIndex);
    if (result.error) {
      socket.emit("error", result.error);
    } else {
      emitUpdate();
      setTimeout(() => {
        const target = game.players.get(data.targetPlayerId);
        if (target) target.hand[data.handIndex].isFaceUp = false;
        emitUpdate();
      }, 4000);
    }
    return;
  });

  socket.on("jackPower", (data) => {
    const result = game.jackPower(socket.id, data.player1Id, data.index1, data.player2Id, data.index2);
    if (result.error) {
      socket.emit("error", result.error);
    } else {
      emitUpdate();
    }
    return;
  })

});

