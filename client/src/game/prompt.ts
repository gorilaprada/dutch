import type { Pick } from "./clicks.ts";
import type { RoomView } from "./protocol.ts";
import { isMyTurn, isSpectator, nameOf } from "./selectors.ts";

export type Prompt = { text: string; idle: boolean }; // idle = nothing for me to do

// The line above my hand: what I can do right now, or who we wait on
export function promptFor(roomView: RoomView, jackPick: Pick | null, stackMode: boolean, eliminated = false): Prompt {
  const { phase, turnIndex, peek, you, fromDiscard, canStack, topDiscard } = roomView.view;
  const name = (seat: number) => nameOf(roomView, seat);
  const act = (text: string): Prompt => ({ text, idle: false });
  const wait = (text: string): Prompt => ({ text, idle: true });

  if (phase === "scoring") return wait("Round over: revealing hands…");
  if (phase === "finished") return wait("The game is over.");
  if (phase === "memorizing") return isSpectator(roomView) ? wait("Players are memorizing their cards…") : act("Memorize your two cards.");
  if (phase === "peeking" && peek) {
    const target = peek.targetSeat === you ? "your" : `${name(peek.targetSeat)}'s`;
    return peek.peeker === you
      ? act(`Peeking at ${target} card ${peek.handIndex + 1}…`)
      : wait(`${name(peek.peeker)} is peeking at ${target} card ${peek.handIndex + 1}…`);
  }
  if (isSpectator(roomView)) {
    return wait(`${eliminated ? "You're out." : "You're watching."} ${name(turnIndex)} is playing.`);
  }

  const myTurn = isMyTurn(roomView);
  if (phase === "power_queen") {
    return myTurn ? act("Queen power: pick any card to peek at.") : wait(`${name(turnIndex)} is using the Queen power…`);
  }
  if (phase === "power_jack") {
    if (!myTurn) return wait(`${name(turnIndex)} is using the Jack power…`);
    return act(jackPick
      ? "Jack power: now pick a card from another player."
      : "Jack power: pick the first of two cards to swap.");
  }
  if (stackMode) return act("Pick one of your cards to stack on the discard pile.");
  if (myTurn && phase === "drawing") return act("Your turn: draw from the deck or the discard pile, or call Dutch.");
  if (myTurn && phase === "deciding") {
    return act(fromDiscard
      ? "Click one of your cards to switch it with the card you took."
      : "Click one of your cards to switch it, or discard the drawn card.");
  }
  const tip = canStack && topDiscard ? " Click one of your cards to stack it on a match." : "";
  return wait(`Waiting on ${name(turnIndex)}…${tip}`);
}
