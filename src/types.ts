export const SUITS = [ "♤" , "♡" , "♢" , "♧" ] as const;
export type Suit = (typeof SUITS)[number];

export type Card = Readonly<{
  id: string;
  suit: Suit;
  value: number;
}>;

export type Deck = Readonly<{
  drawPile: readonly Card[];
  discardPile: readonly Card[];
}>;

export type DealCardResult = Readonly<{
  dealtCards: readonly Card[],
  deck: Deck;
}>;

export type Player = Readonly<{
  seat: number;
  hand: readonly Card[];
  drawnCard: Card | null;
  score: number;
  isReady: boolean;
}>;

export type Phase =
  | "lobby"
  | "memorizing"
  | "drawing"
  | "deciding"
  | "power_jack"
  | "power_queen"
  | "peeking"
  | "scoring"
  | "finished";

 export type Move =
  | { type: "addPlayer" }
  | { type: "ready"; seat: number }
  | { type: "start" }
  | { type: "endMemorizing" }
  | { type: "draw"; seat: number; from: "drawPile" | "discardPile" }
  | { type: "switch"; seat: number; handIndex: number }
  | { type: "discard"; seat: number }
  | { type: "stack"; seat: number; handIndex: number }
  | { type: "jack"; seat: number; seat1: number; seat2: number; i1: number; i2: number }
  | { type: "queen"; seat: number; targetSeat: number; handIndex: number }
  | { type: "endPeek" }
  | { type: "dutch"; seat: number }
  | { type: "countPoints" }
  | { type: "leave"; seat: number };

export type Peek = {
  peeker: number;
  targetSeat: number;
  handIndex: number;
};

export type Dutch = {
  seat: number;
};

// Only public information: every player may see the last action
export type Action =
  | { type: "join"; seat: number }
  | { type: "ready"; seat: number }
  | { type: "leave"; seat: number }
  | { type: "start" }
  | { type: "endMemorizing" }
  | { type: "draw"; seat: number; from: "drawPile" }
  | { type: "draw"; seat: number; from: "discardPile"; card: Card }
  | { type: "switch"; seat: number; handIndex: number; discarded: Card }
  | { type: "discard"; seat: number; discarded: Card }
  | { type: "stack"; seat: number; handIndex: number; card: Card; success: boolean }
  | { type: "jack"; seat: number; seat1: number; i1: number; seat2: number; i2: number }
  | { type: "queen"; seat: number; targetSeat: number; handIndex: number }
  | { type: "endPeek"; seat: number }
  | { type: "dutch"; seat: number }
  | { type: "countPoints" };

export type GameState = Readonly<{
  deck: Deck;
  players: ReadonlyMap<number, Player>;
  turnIndex: number;
  fromDiscard: boolean;
  phase: Phase;
  canStack: boolean;
  maxPlayers: number;
  peek: Peek | null;
  dutch: Dutch | null;
  lastAction: Action | null;
  actionSeq: number;
}>;

export type GameResult = 
  { ok: false, error: string } |
  { ok: true, state: GameState };
