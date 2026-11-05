import { cardLabel } from "./cards.ts";
import type { Action } from "./protocol.ts";

type NameOf = (seat: number) => string;

// lastAction in words, for the last-move line. Card numbers are 1-based
export function describeAction(action: Action | null, nameOf: NameOf, you: number | null): string | null {
  if (action === null) return null;
  const who = (seat: number) => (seat === you ? "You" : nameOf(seat));
  const whose = (seat: number) => (seat === you ? "your" : `${nameOf(seat)}'s`);
  const nth = (handIndex: number) => `card ${handIndex + 1}`;

  switch (action.type) {
    case "join":
      return `${who(action.seat)} joined`;
    case "ready":
      return action.seat === you ? "You are ready" : `${nameOf(action.seat)} is ready`;
    case "leave":
      return `${who(action.seat)} left`;
    case "start":
      return "The cards are dealt";
    case "endMemorizing":
      return "Cards face down: play!";
    case "draw":
      return action.from === "drawPile"
        ? `${who(action.seat)} drew from the deck`
        : `${who(action.seat)} took ${cardLabel(action.card)} from the discard pile`;
    case "switch":
      return `${who(action.seat)} switched ${nth(action.handIndex)} and discarded ${cardLabel(action.discarded)}`;
    case "discard":
      return `${who(action.seat)} discarded ${cardLabel(action.discarded)}`;
    case "stack":
      return action.success
        ? `${who(action.seat)} stacked ${cardLabel(action.card)}`
        : `${who(action.seat)} stacked ${cardLabel(action.card)}: wrong, +1 card`;
    case "jack":
      return `${who(action.seat)} swapped ${whose(action.seat1)} ${nth(action.i1)} with ${whose(action.seat2)} ${nth(action.i2)}`;
    case "queen":
      return `${who(action.seat)} peeked at ${whose(action.targetSeat)} ${nth(action.handIndex)}`;
    case "endPeek":
      return action.seat === you ? "Your peek is over" : `${nameOf(action.seat)}'s peek is over`;
    case "dutch":
      return `${who(action.seat)} called DUTCH`;
    case "countPoints":
      return "Round scored";
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
}
