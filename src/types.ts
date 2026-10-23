export const SUITS = [ "♤" , "♡" , "♢" , "♧" ] as const;
export type Suit = (typeof SUITS)[number];
export const PLAYERS = [0, 1, 2, 3] as const;
export type Players= (typeof PLAYERS)[number];

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

export type Phase = "lobby" | "memorizing" | "drawing" | "deciding" | "power_jack" | "power_queen" | "peeking";

export type Peek = {
  peeker: number;
  targetSeat: number;
  handIndex: number;
};

export type GameState = Readonly<{
  deck: Deck;
  players: ReadonlyMap<number, Player>;
  turnIndex: number;
  fromDiscard: boolean;
  phase: Phase;
  canStack: boolean;
  maxPlayers: number;
  peek: Peek | null;
}>;

export type GameResult = 
  { ok: false, error: string } |
  { ok: true, state: GameState };
