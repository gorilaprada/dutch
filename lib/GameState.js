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

    this.canStack = true;

    const drawnCard = this.deck.deck.pop()
    player.addToDrawnCard(drawnCard);

    this.phase = "deciding";

    return { success: true, data: { card: drawnCard }, error: null };
  }

  drawFromDiscard(socketId) {
    const player = this.players.get(socketId);
    if (!player) { return { error: "Player not found" } }

    const activePlayerId = this.playerOrder[this.turnIndex];
    if (socketId !== activePlayerId) {
      return { error: "Not your turn!" }
    }

    this.canStack = true;

    const drawnCard = this.discardPile.pop()
    player.addToDrawnCard(drawnCard);

    this.phase = "deciding";

    return { success: true, data: { card: drawnCard }, error: null };
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

    return { success: true, data: { power: null, phase: this.phase }, error: null };
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
    };
  };

  jackPower(socketId, player1Id, index1, player2Id, index2) {
    if (this.phase !== "power_jack" || this.pendingPower.owner !== socketId) {
      return { success: false, data: null, error: "Not your power to execute" }
    }

    const p1 = this.players.get(player1Id);
    const p2 = this.players.get(player2Id);

    if (!p1 || !p2 || !p1.hand[index1] || !p2.hand[index2]) {
      return { success: false, data: null, error: "Invalid target cards" }
    }

    const temp = p1.hand[index1];
    p1.hand[index1] = p2.hand[index2];
    p2.hand[index2] = temp;



    this.phase = "drawing";
    this.pendingPower = null;
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

    return { success: true, data: null, error: null }
  };

  queenPower(socketId, targetPlayerId, handIndex) {
    if (this.phase !== "power_queen" || this.pendingPower.owner !== socketId) {
      return { success: false, data: null, error: "Not your power to execute" }
    }

    const targetPlayer = this.players.get(targetPlayerId);
    const card = targetPlayer.hand[handIndex];

    card.isFaceUp = true;

    setTimeout(() => {
      card.isFaceUp = false;
      // Emit socket here
    }, 2000);


    this.phase = "drawing";
    this.pendingPower = null;
    this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

    return { success: true, data: { revealedCard: card }, error: null }
  }

  startGame() {
    this.playerOrder = Array.from(this.players.keys());
    this.deck.build();
    this.deck.shuffle();
    this.dealCards();
    this.initiateDiscardPile();
  };

};
