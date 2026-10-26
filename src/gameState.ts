import { type Player, type GameState, type GameResult} from "./types.ts";
import { buildDeck, shuffleDrawPile, dealCards } from "./deck.ts";
import { initPlayer, ready } from "./player.ts";
import { finishTurn } from "./moves.ts";
import { ok, fail } from "./result.ts";

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

  const newState: GameState = {
    ...dealCardsStart(state, random),
    phase: "memorizing",
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
// TODO: Implement countPoints
// TODO: Implement applyMove

// ========= Helper functions =============
function dealCardsStart(state: GameState, random: () => number): GameState {
  let players = new Map<number, Player>();
  let deck = state.deck;
  for (const [seat, player] of state.players) {
    const result = dealCards(deck, 4, random);
    if (result === null) {
      throw new Error("Not enough cards to deal");
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
