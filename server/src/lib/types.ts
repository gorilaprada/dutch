export type Suits = "♤" | "♡" | "♢" | "♧";

export type Card = {
  id: string;
  suit: Suits;
  value: number;
  isFaceUp: boolean;
}

export interface Result {
  error: string | null;
}

export interface DrawResult extends Result {
  data?: {
    card: Card,
    discardTop: Card | null;
  }
}

export type Phase = "drawing" | "deciding" | "power_jack" | "power_queen";
