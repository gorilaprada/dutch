import type { Player, GameState, GameResult, Phase, Move } from "./types.ts";
import { buildDeck, shuffleDrawPile, dealCards } from "./deck.ts";
import { initPlayer, ready, score} from "./player.ts";
import { finishTurn, nextTurn } from "./moves.ts";
import { ok, fail } from "./result.ts";

const TURN_PHASES: Phase[] = ["drawing", "deciding", "power_jack", "power_queen", "peeking"];

export function initGameState(random: () => number = Math.random): GameState {
  const deck = shuffleDrawPile(buildDeck(), random);
  const gameState: GameState = {
    deck,
    players: new Map(),
    turnIndex: 0,
    fromDiscard: false,
    phase: "lobby",
    canStack: true,
    maxPlayers: 4,
    peek: null,
    dutch: null,
  };

  return gameState;
}

export function addPlayer(state: GameState): GameResult{
  const seat = findFreeSeat(state);

  // Checks
  if (state.phase !== "lobby") return fail("Game has started");
  if (seat === null) return fail("Lobby full");

  const newPlayer = initPlayer(seat);
  const players = new Map(state.players);
  players.set(newPlayer.seat, newPlayer)

  const newState: GameState = {
    ...state,
    players,
  };

  return ok(newState);
}

export function removePlayer(state: GameState, seat: number): GameResult {
  if (!state.players.has(seat)) return fail("Player does not exist");
  let baseState: GameState = state;
  if (state.turnIndex === seat) {
    baseState = TURN_PHASES.includes(state.phase)
      ? finishTurn(state)
      : {...state, turnIndex: nextTurn(state)};
  }

  const players = new Map(baseState.players);
  players.delete(seat);
  const inRound = baseState.phase !== "lobby" && baseState.phase !== "finished";

  return ok({
    ...baseState,
    players,
    dutch: baseState.dutch?.seat === seat ? null : baseState.dutch,
    peek: baseState.peek?.peeker === seat || baseState.peek?.targetSeat === seat ? null : baseState.peek,
    phase: inRound && players.size < 2 ? "finished" : baseState.phase,
  })
}

export function setPlayerReady(state: GameState, seat: number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (state.phase !== "lobby") return fail("Game has started");
  if (!player) return fail("Player not found");

  const newPlayer = ready(player);
  const players = new Map(state.players);
  players.set(seat, newPlayer);

  const newState: GameState = {
    ...state,
    players,
  };

  return ok(newState);
}

export function startGame(state: GameState, random: () => number): GameResult {
  // Checks
  if (state.players.size < 2) return fail("Must be at least 2 players");
  if (state.phase !== "lobby") return fail("Game already started");
  for (const [_, player] of state.players) {
    if (!player.isReady) {
      return fail("Not everyone is ready");
    }

  }

  const dealCardsState = dealCardsStart(state, random);
  if (dealCardsState === null) return fail("Could not deal cards");
  const newState: GameState = {
    ...dealCardsState,
    phase: "memorizing",
    turnIndex: Math.min(...dealCardsState.players.keys()),
  };

  return ok(newState);
}

export function endMemorizing(state: GameState): GameResult {
  if (state.phase !== "memorizing") return fail("Not memorizing right now");

  const newState: GameState = {
    ...state,
    phase: "drawing",
  };

  return ok(newState);
}

export function endPeek(state: GameState): GameResult {
  if (state.phase !== "peeking") return fail("No peeking right now");
  const newState: GameState = finishTurn({
    ...state,
    peek: null,
  });

  return ok(newState);
}

export function countPoints(state: GameState, random: () => number): GameResult {
  if (state.phase !== "scoring") return fail("Game has not ended");

  const scored = [...state.players.values()]
    .map(player => ({
      ...score(player),
      hand: [],
      drawnCard: null,
      isReady: false,
    }));

  let survivors = scored.filter(player => player.score > 0);
  if (survivors.length === 0) {
    const best = Math.max(...scored.map(player => player.score));
    survivors = scored.filter(player => player.score === best);
  }

  const players = new Map(survivors.map(player => [player.seat, player]));
  const finished = survivors.length < 2 || survivors.every(player => player.score <= 0);
 
  const newState: GameState = {
    ...initGameState(random),
    players,
    phase: finished ? "finished" : "lobby",
    turnIndex: Math.min(...players.keys()),
  };

  return ok(newState);
}


// ========= Helper functions =============

function dealCardsStart(state: GameState, random: () => number): GameState | null {
  let players = new Map<number, Player>();
  let deck = state.deck;
  for (const [seat, player] of state.players) {
    const result = dealCards(deck, 4, random);
    if (result === null) {
      return null;
    };
    deck = result.deck;
    players.set(seat, {
      ...player,
      hand: [...result.dealtCards]
    });
  };
 
  const newState: GameState = {
    ...state,
    deck,
    players,
  };

  return newState;
}

function findFreeSeat(state: GameState): number | null {
  for (let i = 0; i < state.maxPlayers; i++) {
    if (!state.players.has(i)) {
      return i;
    }
  };
  return null;
}
