import Player from './Player.js'
import Deck from './Deck.js'
import type { Result, DrawResult, Phase, Card } from "./types.ts";

export default class GameState {
  deck: Deck = new Deck();
  discardPile: Card[] = [];
  players: Map<string, Player> = new Map();
  playerOrder: string[] = [];
  turnIndex: number = 0;
  fromDiscard: boolean = false;
  phase: Phase = "drawing";
  pendingPowerOwner: string | null = null;
  canStack: boolean = true;
  maxPlayers: number = 4;

  // Game automated methods

  startGame(): void {
    this.playerOrder = Array.from(this.players.keys());
    this.deck.build();
    this.deck.shuffle();
    this.dealCards();
    this.initiateDiscardPile();
  };

  addPlayer(socketId: string, name: string): Result {
    // Validation
    if (this.players.size >= this.maxPlayers) {
      return { error: "Lobby full" }
    };

    // Logic
    const newPlayer = new Player(socketId, name)
    this.players.set(socketId, newPlayer)

    // Function output
    return { error: null };
  }

  dealCards(): Result {
    // Logic
    const players = Array.from(this.players.values())

    players.forEach(player => {
      const hand = this.deck.dealHand();
      player.addCards(hand);
    })

    // Function output
    return { error: null };
  }

  initiateDiscardPile(): Result {
    try {
      // Logic
      const firstCard = this.deck.deck.pop();
      if (!firstCard) {
        throw new Error("Error: with deck initiation");
      }

      firstCard.isFaceUp = true;
      this.discardPile.push(firstCard);

      // Function output
      return { error: null };
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }

    return { error: "Unknown error with initiateDiscardPile" };
  }

  cardMemorization(): Result {
    // Logic
    const players = Array.from(this.players.values())

    players.forEach((player: Player): void => {
      player.setCardVisibility([0, 1], true)
    });

    // Function output
    return { error: null }
  }

  // Player Methods

  drawFrom(socketId: string, drawFrom: "deck" | "discardPile"): DrawResult {
    try {
      // Set values
      const player = this.players.get(socketId);
      const activePlayerId = this.playerOrder[this.turnIndex];

      // Validation
      if (!player) throw new Error("Player not found");
      if (socketId !== activePlayerId || this.phase !== "drawing") {
        throw new Error("Not your turn!");
      }


      // Logic (changes made to the game state)
      let drawnCard;
      if (drawFrom === "discardPile") {
        drawnCard = this.discardPile.pop()
        this.fromDiscard = true;
        console.log("fromDiscard = true");
      } else {
        drawnCard = this.deck.deck.pop();
      }

      if (!drawnCard) throw new Error(`Cannot draw from empty ${drawFrom}`);

      player.addToDrawnCard(drawnCard);

      // Side effects of move
      this.canStack = true;
      this.phase = "deciding";

      // Function output
      const topDiscardCard = this.discardPile.at(-1) ?? null;
      return {
        data: { card: drawnCard, discardTop: topDiscardCard },
        error: null
      };
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }

    return { error: "Unknown error in drawFrom" };
  }

  switchCards(socketId: string, handIndex: number): Result {
    try {
      // Set values
      const player = this.players.get(socketId);
      const activePlayerId = this.playerOrder[this.turnIndex];

      // Validation
      if (!player) throw new Error("Player not found");

      if (socketId !== activePlayerId) {
        throw new Error("Not your turn!");
      }

      if (this.phase !== "deciding") {
        throw new Error("Cannot perform this action because of the phase of the game");
      }


      // Logic
      const oldCard = player.hand[handIndex];
      if (!oldCard) throw new Error("No card to switch with");
      oldCard.isFaceUp = true;

      if (!player.drawnCard) throw new Error("Player has no drawn card");
      player.drawnCard.isFaceUp = false;
      player.hand[handIndex] = player.drawnCard;

      this.discardPile.push(oldCard);
      player.drawnCard = null;

      // Side effects
      if (oldCard.value === 11) {
        this.phase = "power_jack";
        this.pendingPowerOwner = socketId;
        return { error: null }
      }

      if (oldCard.value === 12) {
        this.phase = "power_queen";
        this.pendingPowerOwner = socketId;
        return { error: null }
      }

      this.phase = "drawing";
      this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length

      // Function output
      return { error: null };
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }
    return { error: "Unknown error in drawFrom" };
  }

  discardCard(socketId: string): Result {
    try {
      // Set values
      const player = this.players.get(socketId);
      const activePlayerId = this.playerOrder[this.turnIndex];

      // Validation
      if (!player) throw new Error("Player not found");

      if (socketId !== activePlayerId) {
        throw new Error("Not your turn!");
      }

      if (this.phase !== "deciding") {
        throw new Error("Cannot perform this action because of the phase of the game");
      }

      if (this.fromDiscard) {
        throw new Error("Cannot perform this action because you picked from discard");
      }

      // Logic (changes made to the game state)
      if (!player.drawnCard) throw new Error("Player has no drawn card");

      const discardCard = player.drawnCard;
      discardCard.isFaceUp = true;
      this.discardPile.push(discardCard);
      player.drawnCard = null;

      // Side effects
      if (discardCard.value === 11) {
        this.phase = "power_jack";
        this.pendingPowerOwner = socketId;
        return { error: null }
      }

      if (discardCard.value === 12) {
        this.phase = "power_queen";
        this.pendingPowerOwner = socketId;
        return { error: null }
      }

      this.phase = "drawing";
      if (this.fromDiscard) {
        this.fromDiscard = false;
        console.log("fromDiscard = false");
      }
      this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length

      // Function output
      return { error: null };

    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }

    return { error: "Unknown error in drawFrom" };
  }

  stack(socketId: string, handIndex: number): Result {
    try {
      // Set values
      const player = this.players.get(socketId);
      if (!player) throw new Error("Player not found");
      const stackCard = player.hand[handIndex];
      const topDiscard = this.discardPile.at(-1);

      // Validation
      if (!stackCard || !topDiscard) throw new Error("Invalid Move");

      // Logic (changes made to the game state)
      if (stackCard.value === topDiscard.value && this.canStack === true) {
        stackCard.isFaceUp = true;
        this.discardPile.push(stackCard)

        player.hand.splice(handIndex, 1);

        this.canStack = false;

        // Function output
        return { error: null }

      } else {
        const penaltyCard = this.deck.deck.pop()
        if (!penaltyCard) throw new Error("Could not extract a penalty card");
        player.hand.push(penaltyCard);
        throw new Error("Cannot discard! A penalty is coming.");
      };

    } catch (err) {

      if (err instanceof Error) {
        return { error: err.message };
      }

    }

    return { error: "Unknown error in drawFrom" };
  };

  jackPower(socketId: string, player1Id: string, index1: number, player2Id: string, index2: number): Result {
    try {
      // Set values
      const p1 = this.players.get(player1Id);
      const p2 = this.players.get(player2Id);

      // Validation
      if (this.phase !== "power_jack" || this.pendingPowerOwner !== socketId) {
        throw new Error("Not your power to execute");
      }

      if (!p1 || !p2 || !p1.hand[index1] || !p2.hand[index2]) {
        throw new Error("Invalid target cards");
      }

      // Logic (change smade to the state of the game)
      const temp = p1.hand[index1];
      p1.hand[index1] = p2.hand[index2];
      p2.hand[index2] = temp;

      // Side effects
      this.phase = "drawing";
      this.pendingPowerOwner = null;
      this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

      // Function output
      return { error: null }

    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }

    return { error: "Unknown error in drawFrom" };
  };

  queenPower(socketId: string, targetPlayerId: string, handIndex: number): Result {
    try {
      // Validation
      if (this.phase !== "power_queen" || this.pendingPowerOwner !== socketId) {
        throw new Error("Not your power to execute");
      }

      // Set values
      const targetPlayer = this.players.get(targetPlayerId);
      if (!targetPlayer) throw new Error("Target player not found");
      const card = targetPlayer.hand[handIndex];

      // Logic (changes made to the game state)
      if (!card) throw new Error("Target player has no card at that index");
      card.isFaceUp = true;

      // Side effects
      this.phase = "drawing";
      this.pendingPowerOwner = null;
      this.turnIndex = (this.turnIndex + 1) % this.playerOrder.length;

      // Function output
      return { error: null }

    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
    }

    return { error: "Unknown error in drawFrom" };
  }
}
