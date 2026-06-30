export default class GameState {
  deck: Deck;
  discardPile: Card[];
  players: Map<string, Player>;
  playerOrder: string[];
  turnIndex: number;
  state: string;
  phase: string;
  pendingPowerOwner: string | null;
  canStack: boolean;
  maxPlayers: number;

  constructor(): void;
  startGame(): void;
  addPlayer(socketId: string, name: string): Result;
  dealCards(): Result;
  initiateDiscardPile(): Result;
  cardMemorization(): Result;
  drawFrom(socketId: string, drawFrom: string): DrawResult;
  switchCards(socketId: string, handIndex: string): Result;
  discardCard(socketId: string): Result;
  stack(socketId: string, handIndex: number): Result;
  jackPower(socketId: string, player1Id: string, index1: number, player2Id: string, index2: number): Result;
  queenPower(socketId: string, targetPlayerId: string, handIndex: number): Result;
}

export interface Result {
  error: string | null;
}

export interface DrawResult extends Result {
  data: {
    card: Card,
    discardTop: Card | null;
  }
}

export type Card = {
  id: string;
  suit: string;
  value: number;
  isFaceUp: boolean;
}

export type Player = {
  id: string;
  name: string;
  hand: Card[];
  drawnCard: Card | null;
  score: number;
  isReady: boolean;

  constructor(id: string, name: string): void;
  addCards(cards: Card[]): void;
  addToDrawnCard(card: Card): void;
  setCardVisibility(indices: number[], visibility: boolean): void;
  hideAllCards(): void;
}

export type Deck = {
  deck: Card[];
  suits: string[];

  constructor(): void;
  build(): void;
  shuffle(): void;
  dealHand(): Card[];
}

export type Game = {
  deck: Deck;
  discardPile: Card[];
  players: Map<string, Player>;
  playerOrder: string[];
  turnIndex: number;
  state: string;
  phase: string;
  pendingPowerOwner: string | null;
  canStack: boolean;
  maxPlayers: number;
}
