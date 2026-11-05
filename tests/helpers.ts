import {
  initGameState,
  addPlayer,
  setPlayerReady,
  startGame,
  endMemorizing,
} from "../src/gameState.ts";
import type { Card, GameResult, GameState, Suit } from "../src/types.ts";

export const random = () => 0;

export function card(suit: Suit, value: number): Card {
  return { id: `${suit}_${value}`, suit, value };
}

export function unwrap(result: GameResult): GameState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

export function setHand(state: GameState, seat: number, hand: Card[]): GameState {
  const players = new Map(state.players);
  players.set(seat, { ...players.get(seat)!, hand });
  return { ...state, players };
}

export function setDiscard(state: GameState, discardPile: Card[]): GameState {
  return { ...state, deck: { ...state.deck, discardPile } };
}

// Two players, ready, cards dealt, phase memorizing
export function memorizing(): GameState {
  let state = initGameState(random);
  state = unwrap(addPlayer(state));
  state = unwrap(addPlayer(state));
  state = unwrap(setPlayerReady(state, 0));
  state = unwrap(setPlayerReady(state, 1));
  return unwrap(startGame(state, random));
}

// Same, memorizing over, seat 0 to draw
export function playing(): GameState {
  return unwrap(endMemorizing(memorizing()));
}
