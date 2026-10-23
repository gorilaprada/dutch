import { type Player, type GameState, type GameResult} from "./types.ts";
import { buildDeck, shuffleDrawPile, dealCards } from "./deck.ts";
import { initPlayer, ready } from "./player.ts";
import { nextTurn } from "./moves.ts";
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
  };

  return gameState;
}

export function addPlayer(state: GameState): GameResult{
  const seat = findFreeSeat(state);
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


export function dealCardst(state: GameState, random: () => number = Math.random): GameResult{
  let players = new Map<number, Player>();
  let deck = state.deck;
  for (const [seat, player] of state.players) {
    const result = dealCards(deck, 4, random);
    if (result === null) {
      return fail("Not enough cards to deal");
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
    phase: "memorizing"
  };

  return ok(newState);
}

export function endPeek(state: GameState): GameResult {
  if (state.phase !== "peeking") return fail("No peeking right now");
  const newState: GameState = {
    ...state,
    phase: "drawing",
    peek: null,
    turnIndex: nextTurn(state)
  };

  return ok(newState);
}

export function setPlayerReady(state: GameState, seat: number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (state.phase !== "lobby") return fail("Game has started");
  if (!player) return fail("Player not found");

  const newPlayer = ready(player);
  const newPlayers = new Map(state.players);
  newPlayers.set(seat, newPlayer);

  const newState: GameState = {
    ...state,
    players: newPlayers,
  };

  return ok(newState);
}

export function startGame(state: GameState): GameResult {
  if (state.phase !== "lobby") return fail("Game already started");

  for (const [_, player] of state.players) {
    if (!player.isReady) {
      return fail("Not everyone is ready");
    }
  }

  const newState: GameState = {
    ...state,
    phase: "memorizing",
  };

  return ok(newState);
}


// TODO: Implement applyMove

// ========= Helper functions =============
function findFreeSeat(state: GameState): number | null {
  for (let i = 0; i < state.maxPlayers; i++) {
    if (!state.players.has(i)) {
      return i;
    }
  };
  return null;
}

