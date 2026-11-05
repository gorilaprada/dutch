import type { ClientMove, RoomView } from "./protocol.ts";
import { isMyTurn, isSpectator } from "./selectors.ts";

export type Pick = { seat: number; handIndex: number };

// What clicking a card does: send a move, or set/clear the Jack's first pick
export type CardClick =
  | { kind: "none" }
  | { kind: "move"; move: ClientMove }
  | { kind: "pick"; pick: Pick | null };

const NONE: CardClick = { kind: "none" };
const NO_CLICKS = new Set(["lobby", "memorizing", "peeking", "scoring", "finished"]);

// One rule list, in priority order, for every card on the table
export function cardClick(roomView: RoomView, target: Pick, jackPick: Pick | null, stackMode: boolean): CardClick {
  const { phase, you, canStack } = roomView.view;
  if (NO_CLICKS.has(phase) || isSpectator(roomView)) return NONE;

  const myTurn = isMyTurn(roomView);
  if (phase === "power_queen") {
    return myTurn ? { kind: "move", move: { type: "queen", targetSeat: target.seat, handIndex: target.handIndex } } : NONE;
  }
  if (phase === "power_jack") {
    if (!myTurn) return NONE;
    if (!jackPick) return { kind: "pick", pick: target };
    if (jackPick.seat === target.seat && jackPick.handIndex === target.handIndex) return { kind: "pick", pick: null };
    // Same hand: the lib needs two different players, so move the pick
    if (jackPick.seat === target.seat) return { kind: "pick", pick: target };
    return {
      kind: "move",
      move: { type: "jack", seat1: jackPick.seat, i1: jackPick.handIndex, seat2: target.seat, i2: target.handIndex },
    };
  }

  // Outside powers only my own cards react
  if (target.seat !== you) return NONE;
  if (stackMode) return { kind: "move", move: { type: "stack", handIndex: target.handIndex } };
  if (myTurn && phase === "deciding") return { kind: "move", move: { type: "switch", handIndex: target.handIndex } };
  // Not deciding: a click stacks the card on the discard pile
  return canStack ? { kind: "move", move: { type: "stack", handIndex: target.handIndex } } : NONE;
}

export function pileClick(roomView: RoomView, pile: "drawPile" | "discardPile"): ClientMove | null {
  const { phase, topDiscard } = roomView.view;
  if (!isMyTurn(roomView) || phase !== "drawing") return null;
  if (pile === "discardPile" && topDiscard === null) return null;
  return { type: "draw", from: pile };
}
