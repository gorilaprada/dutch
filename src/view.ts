import type { GameState, PeekView, SeatView, ViewResult } from "./types.ts";
import { okView, failView } from "./result.ts";

// Cards a player sees of their own hand while memorizing
const MEMORIZE_INDICES = [0, 1];

// seat null = spectator (e.g. an eliminated player): sees only public cards
export function viewFor(state: GameState, seat: number | null): ViewResult {
  if (seat !== null && !state.players.has(seat)) return failView("Player not found");

  // Hidden cards are null: never send the Card, its id gives the card away
  const players: SeatView[] = [...state.players.values()]
    .sort((a, b) => a.seat - b.seat)
    .map(player => ({
      seat: player.seat,
      hand: player.hand.map((card, i) => canSee(state, seat, player.seat, i) ? card : null),
      hasDrawnCard: player.drawnCard !== null,
      drawnCard: player.seat === seat ? player.drawnCard : null,
      score: player.score,
      isReady: player.isReady,
    }));

  // Everyone sees who peeks at what, only the peeker sees the card
  const peek: PeekView | null = state.peek && {
    ...state.peek,
    card: state.peek.peeker === seat
      ? state.players.get(state.peek.targetSeat)?.hand[state.peek.handIndex] ?? null
      : null,
  };

  return okView({
    you: seat,
    players,
    drawPileCount: state.deck.drawPile.length,
    topDiscard: state.deck.discardPile.at(-1) ?? null,
    turnIndex: state.turnIndex,
    phase: state.phase,
    fromDiscard: state.fromDiscard,
    canStack: state.canStack,
    maxPlayers: state.maxPlayers,
    peek,
    dutch: state.dutch,
    lastAction: state.lastAction, // public by design
    actionSeq: state.actionSeq,
  });
}

// ========= Helper functions =============
function canSee(state: GameState, viewer: number | null, owner: number, handIndex: number): boolean {
  if (state.phase === "scoring") return true;
  if (state.phase === "memorizing") return viewer === owner && MEMORIZE_INDICES.includes(handIndex);
  return false;
}
