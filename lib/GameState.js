import Player from './Player.js'
import Deck from './Deck.js'

export default class GameState {
  constructor() {
    this.deck = new Deck();
    this.discardPile = [];
    this.players = new Map();
    this.playerOrder = [];
    this.turnIndex = 0;
    this.state = "waiting";
    this.phase = "drawing";
    this.pendingPower = null;
    this.canStack = true;
    this.maxPlayers = 4;
  }

  // Game automated methods

  startGame() {
    this.playerOrder = Array.from(this.players.keys());
    this.deck.build();
    this.deck.shuffle();
    this.dealCards();
    this.initiateDiscardPile();
  };

  addPlayer(socketId, name) {
    // Validation
    if (this.players.size >= this.maxPlayers) {
      return { success: false, data: null, error: "Lobby full" }
    };

    // Logic
    const newPlayer = new Player(socketId, name)
    this.players.set(socketId, newPlayer)

    // Function output
    return { success: true, data: newPlayer, error: null };
  }

  dealCards() {
    // Logic
    const players = Array.from(this.players.values())

    players.forEach(player => {
      const hand = this.deck.dealHand();
      player.addCards(hand);
    })

    // Function output
    return { success: true, data: null, error: null };
  }

  initiateDiscardPile() {
    // Logic
    const firstCard = this.deck.deck.pop();
    firstCard.isFaceUp = true;
    this.discardPile.push(firstCard);

    // Function output
    return { success: true, data: null, error: null };
  }

  cardMemorization() {
    // Logic
    const players = Array.from(this.players.values())

    players.forEach(player => {
      player.setCardVisibility([0, 1], true);
    })

    setTimeout(() => {
      players.forEach(player => {
        player.hideAllCards()
      })
    }, 5000)

    // Function output
    return { succes: true, data: "Return the data to display cards", error: null }
  }

  // Player Methods

  drawFrom(socketId, drawFrom = "deck") {
    // Set values
    const player = this.players.get(socketId);
    const activePlayerId = this.playerOrder[this.turnIndex];

    // Validation
    if (!player) { return { error: "Player not found" } }
    if (socketId !== activePlayerId) {
      return { error: "Not your turn!" }
    }

    // Logic (changes made to the game state)
    let drawnCard;
    if (drawFrom === "discardPile") {
      drawnCard = this.discardPile.pop()
    } else {
      drawnCard = this.deck.deck.pop();
    }
    player.addToDrawnCard(drawnCard);

    // Side effects of move
    this.canStack = true;
    this.phase = "deciding";

    // Function output
    return { success: true, data: { card: drawnCard }, error: null };
  }

  switchCards(socketId, handIndex) {
    // Set values
    const player = this.players.get(socketId);
    const activePlayerId = this.playerOrder[this.turnIndex];

    // Validation
    if (!player) return { success: false, data: null, error: "Player not found" }
    if (!player.drawnCard) return { success: false, data: null, error: "No card drawn" }
    if (socketId !== activePlayerId) {
      return { success: false, data: null, error: "Not your turn!" }
    }

    if (this.phase !== "deciding") {
      return { success: false, data: null, error: "Cannot perform this action because of the phase of the game" }
    }

    if (!Number.isInteger(data.handIndex) || data.handIndex < 0 || data.handIndex >= player.hand.length) {
      return { success: false, data: null, error: "Invalid Card" }
    }

    // Logic (changes made to the game state)
    const oldCard = player.hand[handIndex];
    player.hand[handIndex] = player.drawnCard;
    oldCard.isFaceUp = true;
    this.discardPile.push(oldCard);
    player.drawnCard = null;

    // Side effects
    if (oldCard.value === 11) {
      this.phase = "power_jack";
      this.pendingPower = { type: "JACK", owner: socketId };
      return { success: true, data: { power: "JACK", phase: this.phase }, error: null }
    }

    if (oldCard.value === 12) {
      this.phase = "power_queen";
      this.pendingPower = { type: "QUEEN", owner: socketId };
      return { success: true, data: { power: "QUEEN", phase: this.phase }, error: null }
    }

    this.phase = "drawing";
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length

    // Function output
    return { success: true, data: oldCard, error: null };
  }

  discardCard(socketId) {
    // Set values
    const player = this.players.get(socketId);
    const activePlayerId = this.playerOrder[this.turnIndex];

    // Validation
    if (!player) return { success: false, data: null, error: "Player not found" }
    if (!player.drawnCard) return { success: false, data: null, error: "No card drawn" }

    if (socketId !== activePlayerId) {
      return { success: false, data: null, error: "Not your turn!" }
    }

    if (this.phase !== "deciding") {
      return { success: false, data: null, error: "Cannot perform this action because of the phase of the game" }
    }

    // Logic (changes made to the game state)
    const discardCard = player.drawnCard;
    discardCard.isFaceUp = true;
    this.discardPile.push(discardCard);
    player.drawnCard = null;

    // Side effects
    if (discardCard.value === 11) {
      this.phase = "power_jack";
      this.pendingPower = { type: "JACK", owner: socketId };
      return { success: true, data: { power: "JACK", phase: this.phase }, error: null }
    }

    if (discardCard.value === 12) {
      this.phase = "power_queen";
      this.pendingPower = { type: "QUEEN", owner: socketId };
      return { success: true, data: { power: "QUEEN", phase: this.phase }, error: null }
    }

    this.phase = "drawing";
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length

    // Function output
    return { success: true, data: { power: null, phase: this.phase }, error: null };
  }

  stack(socketId, handIndex) {
    // Set values
    const player = this.players.get(socketId);
    const stackCard = player.hand[handIndex];
    const topDiscard = this.discardPile[this.discardPile.length - 1];

    // Validation
    if (!player) return { success: false, error: "Player not found" }

    if (this.canStack === false) {
      const penaltyCard = this.deck.deck.pop()
      player.hand.push(penaltyCard);
      return { success: false, data: null, error: "Cannot discard, too slow!" }
    }

    if (!stackCard || !topDiscard) return { success: false, data: null, error: "Invalid Move" }

    // Logic (changes made to the game state)
    if (stackCard.value === topDiscard.value) {
      stackCard.isFaceUp = true;
      this.discardPile.push(stackCard)

      player.hand.splice(handIndex, 1);

      this.canStack = false;

      // Function output
      return {
        success: true,
        data: { stackCard },
        error: null
      }
    } else {
      // Special penalty for stacking wrong
      const penaltyCard = this.deck.deck.pop()
      player.hand.push(penaltyCard);
      return { success: false, data: null, error: "Cannot discard." }
    };
  };

  jackPower(socketId, player1Id, index1, player2Id, index2) {
    // Set values
    const p1 = this.players.get(player1Id);
    const p2 = this.players.get(player2Id);

    // Validation
    if (this.phase !== "power_jack" || this.pendingPower.owner !== socketId) {
      return { success: false, data: null, error: "Not your power to execute" }
    }

    if (!p1 || !p2 || !p1.hand[index1] || !p2.hand[index2]) {
      return { success: false, data: null, error: "Invalid target cards" }
    }

    // Logic (change smade to the state of the game)
    const temp = p1.hand[index1];
    p1.hand[index1] = p2.hand[index2];
    p2.hand[index2] = temp;

    // Side effects
    this.phase = "drawing";
    this.pendingPower = null;
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

    // Function output
    return { success: true, data: null, error: null }
  };

  queenPower(socketId, targetPlayerId, handIndex) {
    // Set values
    const targetPlayer = this.players.get(targetPlayerId);
    const card = targetPlayer.hand[handIndex];

    // Validation
    if (this.phase !== "power_queen" || this.pendingPower.owner !== socketId) {
      return { success: false, data: null, error: "Not your power to execute" }
    }

    // Logic (changes made to the game state)
    card.isFaceUp = true;

    setTimeout(() => {
      card.isFaceUp = false;
      // Emit socket here
    }, 2000);

    // Side effects
    this.phase = "drawing";
    this.pendingPower = null;
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

    // Function output
    return { success: true, data: { revealedCard: card }, error: null }
  }
};
