import type { Player, GameState, GameResult, Phase, Move } from "./types.ts";
import { buildDeck, shuffleDrawPile, dealCards, addToDiscardPile } from "./deck.ts";
import { initPlayer, ready, score} from "./player.ts";
import { finishTurn, nextTurn } from "./moves.ts";
import { ok, fail } from "./result.ts";
import { withAction } from "./action.ts";

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
    lastAction: null,
    actionSeq: 0,
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

  return ok(withAction(newState, { type: "join", seat }));
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

  const newState: GameState = {
    ...baseState,
    players,
    dutch: baseState.dutch?.seat === seat ? null : baseState.dutch,
    peek: baseState.peek?.peeker === seat || baseState.peek?.targetSeat === seat ? null : baseState.peek,
    phase: inRound && players.size < 2 ? "finished" : baseState.phase,
  };

  return ok(withAction(newState, { type: "leave", seat }));
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

  return ok(withAction(newState, { type: "ready", seat }));
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

  const dealtState = dealRound(state, random);
  if (dealtState === null) return fail("Could not deal cards");
  const newState: GameState = {
    ...dealtState,
    turnIndex: Math.min(...dealtState.players.keys()),
  };

  return ok(withAction(newState, { type: "start" }));
}

export function endMemorizing(state: GameState): GameResult {
  if (state.phase !== "memorizing") return fail("Not memorizing right now");

  const newState: GameState = {
    ...state,
    phase: "drawing",
  };

  return ok(withAction(newState, { type: "endMemorizing" }));
}

export function endPeek(state: GameState): GameResult {
  if (state.phase !== "peeking") return fail("No peeking right now");
  const newState: GameState = finishTurn({
    ...state,
    peek: null,
  });

  return ok(withAction(newState, { type: "endPeek", seat: state.turnIndex }));
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

  const roundOver: GameState = {
    ...initGameState(random),
    players,
    phase: "finished",
    turnIndex: Math.min(...players.keys()),
    actionSeq: state.actionSeq,
  };
  if (finished) return ok(withAction(roundOver, { type: "countPoints" }));

  // Next round is dealt right away. The round winner starts:
  // the survivor who lost the fewest points (ties: lowest seat)
  const dealtState = dealRound(roundOver, random);
  if (dealtState === null) return fail("Could not deal cards");
  const pointsLost = (seat: number) => state.players.get(seat)!.score - players.get(seat)!.score;
  const starter = [...survivors].sort((a, b) => pointsLost(a.seat) - pointsLost(b.seat) || a.seat - b.seat)[0]!;

  const newState: GameState = {
    ...dealtState,
    turnIndex: starter.seat,
  };

  return ok(withAction(newState, { type: "countPoints" }));
}


// ========= Helper functions =============

// Deals 4 cards to every player, flips the top card onto the discard pile
// and starts the memorizing phase
function dealRound(state: GameState, random: () => number): GameState | null {
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

  const flip = dealCards(deck, 1, random);
  const firstDiscard = flip?.dealtCards[0];
  if (!flip || !firstDiscard) return null;

  const newState: GameState = {
    ...state,
    deck: addToDiscardPile(flip.deck, firstDiscard),
    players,
    phase: "memorizing",
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
