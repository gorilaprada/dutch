import type { Card, PlayerView } from "./protocol.ts";

// Where a card sits on screen: matches the data-slot attribute of PlayingCard
export type SlotRef =
  | { kind: "hand"; seat: number; handIndex: number }
  | { kind: "deck" }
  | { kind: "discard" }
  | { kind: "drawn" };

export type Tone = "power" | "penalty";

export type Animation =
  // A ghost card flies between two slots; card null = face down; duration defaults to FLIGHT_MS
  | { kind: "fly"; from: SlotRef; to: SlotRef; card: Card | null; delay: number; tone?: Tone; duration?: number }
  // A wrong stack: the card shakes red where it is
  | { kind: "shake"; at: SlotRef }
  // A Queen peek: the target card lifts, cyan
  | { kind: "lift"; at: SlotRef };

export const FLIGHT_MS = 550;
// A draw is the most frequent move: short, so the deck-to-drawn hop stays snappy
export const DRAW_MS = 300;
export const SHAKE_MS = 450;
export const DEAL_STAGGER_MS = 60;

export function slotKey(slot: SlotRef): string {
  return slot.kind === "hand" ? `hand-${slot.seat}-${slot.handIndex}` : slot.kind;
}

// What to animate for the step prev -> next. Only one action apart: a reload,
// a resume or a skipped view animates nothing
export function animationsFor(prev: PlayerView | null, next: PlayerView): Animation[] {
  if (prev === null || next.actionSeq !== prev.actionSeq + 1) return [];
  const action = next.lastAction;
  if (action === null) return [];

  const hand = (seat: number, handIndex: number): SlotRef => ({ kind: "hand", seat, handIndex });
  const deck: SlotRef = { kind: "deck" };
  const discard: SlotRef = { kind: "discard" };
  const drawn: SlotRef = { kind: "drawn" };

  switch (action.type) {
    case "start":
      return deal(next);
    case "countPoints":
      // The next round was dealt straight away
      return next.phase === "memorizing" ? deal(next) : [];
    case "draw":
      return action.from === "drawPile"
        ? [{ kind: "fly", from: deck, to: drawn, card: null, delay: 0, duration: DRAW_MS }]
        : [{ kind: "fly", from: discard, to: drawn, card: action.card, delay: 0, duration: DRAW_MS }];
    case "switch":
      return [
        { kind: "fly", from: drawn, to: hand(action.seat, action.handIndex), card: null, delay: 0 },
        { kind: "fly", from: hand(action.seat, action.handIndex), to: discard, card: action.discarded, delay: 0 },
      ];
    case "discard":
      return [{ kind: "fly", from: drawn, to: discard, card: action.discarded, delay: 0 }];
    case "stack": {
      const from = hand(action.seat, action.handIndex);
      if (action.success) return [{ kind: "fly", from, to: discard, card: action.card, delay: 0 }];
      // The penalty card lands at the end of the hand once the shake is over
      const penaltyIndex = (next.players.find(player => player.seat === action.seat)?.hand.length ?? 1) - 1;
      return [
        { kind: "shake", at: from },
        { kind: "fly", from: deck, to: hand(action.seat, penaltyIndex), card: null, delay: SHAKE_MS, tone: "penalty" },
      ];
    }
    case "jack": {
      const a = hand(action.seat1, action.i1);
      const b = hand(action.seat2, action.i2);
      return [
        { kind: "fly", from: a, to: b, card: null, delay: 0, tone: "power" },
        { kind: "fly", from: b, to: a, card: null, delay: 0, tone: "power" },
      ];
    }
    case "queen":
      return [{ kind: "lift", at: hand(action.targetSeat, action.handIndex) }];
    default:
      // join, ready, leave, endMemorizing, endPeek, dutch: flips and the
      // banner animate in their own components
      return [];
  }
}

// One card at a time around the table, like a real deal
function deal(view: PlayerView): Animation[] {
  const longest = Math.max(0, ...view.players.map(player => player.hand.length));
  const flights: Animation[] = [];
  for (let handIndex = 0; handIndex < longest; handIndex++) {
    for (const player of view.players) {
      if (handIndex >= player.hand.length) continue;
      flights.push({
        kind: "fly",
        from: { kind: "deck" },
        to: { kind: "hand", seat: player.seat, handIndex },
        card: null,
        delay: flights.length * DEAL_STAGGER_MS,
      });
    }
  }
  return flights;
}
