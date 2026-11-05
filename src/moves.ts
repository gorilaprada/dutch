import type { GameState, GameResult, Card, Phase } from "./types.ts";
import { ok, fail } from "./result.ts";
import { drawCard, addToDiscardPile } from "./deck.ts";
import { withAction } from "./action.ts";
import { 
  addDrawnCard,
  addCards,
  switchDrawnToHand,
  removeDrawnCard,
  removeCard,
} from "./player.ts";

export function drawFrom(state: GameState, seat: number, drawFrom: "drawPile" | "discardPile", random: () => number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (seat !== state.turnIndex) return fail("Not your turn");
  if (state.phase !== "drawing") return fail("Not drawing right now");
  if (drawFrom === "discardPile" && state.deck.discardPile.length === 0) return fail("Discard Pile is empty");
  if (!player) return fail("Player not found");

  const result = drawCard(state.deck, drawFrom, random);
  if (!result) return fail("Cannot draw");
 
  const drawnCard = result.dealtCards[0];
  if (!drawnCard) return fail("Nothing to draw");

  const newPlayers = new Map(state.players);
  newPlayers.set(seat, addDrawnCard(player, drawnCard))

  const newState: GameState = {
    ...state,
    deck: result.deck,
    players: newPlayers,
    phase: "deciding",
    fromDiscard: drawFrom === "discardPile",
    canStack: true,
  };

  // A card from the discard pile was face up, one from the draw pile stays secret
  return ok(withAction(newState,
    drawFrom === "discardPile"
      ? { type: "draw", seat, from: "discardPile", card: drawnCard }
      : { type: "draw", seat, from: "drawPile" }
  ));
}

export function switchCards(state: GameState, seat: number, handIndex: number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (seat !== state.turnIndex) return fail("Not your turn");
  if (state.phase !== "deciding") return fail("Not deciding right now");
  if (!player) return fail("Player not found");
  if (!player.drawnCard) return fail("No drawn card");
  const discard = player.hand[handIndex];
  if (!discard) return fail(`No card at index: ${handIndex}`);

  // Logic
  const newDeck = addToDiscardPile(state.deck, discard);
  const newPlayers = new Map(state.players);
  const playerModifications = [
    switchDrawnToHand,
    removeDrawnCard,
  ];
  const newPlayer = playerModifications.reduce((acc, fn) => fn(acc, handIndex), player);
  newPlayers.set(seat, newPlayer);

  const newPhase = phaseAfterCard(discard);
  const newState: GameState = {
    ...state,
    deck: newDeck,
    players: newPlayers,
    canStack: true,
  }

  return ok(withAction(
    newPhase === "drawing" ?
      finishTurn(newState) :
      {...newState, phase: newPhase},
    { type: "switch", seat, handIndex, discarded: discard }
  ));
}

export function discardCard(state: GameState, seat: number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (seat !== state.turnIndex) return fail("Not your turn");
  if (state.phase !== "deciding") return fail("Not deciding right now");
  if (!player) return fail("Player not found");
  if (!player.drawnCard) return fail("No drawn card");
  if (state.fromDiscard) return fail("Takers keepers");

  // Logic
  const newDeck = addToDiscardPile(state.deck, player.drawnCard);
  const newPlayers = new Map(state.players);
  const newPlayer = removeDrawnCard(player);
  newPlayers.set(seat, newPlayer);

  const newPhase = phaseAfterCard(player.drawnCard);
  const newState: GameState = {
    ...state,
    deck: newDeck,
    players: newPlayers,
    canStack: true,
  };

  return ok(withAction(
    newPhase === "drawing" ?
      finishTurn(newState) :
      {...newState, phase: newPhase},
    { type: "discard", seat, discarded: player.drawnCard }
  ));
}

export function stack(state: GameState, seat: number, handIndex: number, random: () => number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (
    !state.canStack
    || state.phase === "memorizing"
    || state.phase === "scoring"
    || state.phase === "finished"
    || state.phase === "peeking"
  ) return fail("Cannot stack right now");
  if (!player) return fail("Player not found");

  // Logic
  const stackCard = player.hand[handIndex];
  const topDiscard = state.deck.discardPile.at(-1);
  if (!stackCard || !topDiscard) return fail("Invalid Move");


  if (stackCard.value !== topDiscard.value) {
    const result = drawCard(state.deck, "drawPile", random);
    if (!result) return fail("Cannot draw");
 
    const drawnCard = result.dealtCards[0];
    if (!drawnCard) return fail("Nothing to draw");

    const newPlayers = new Map(state.players);
    newPlayers.set(seat, addCards(player, [drawnCard]));

    // The wrongly stacked card is shown to everyone before going back
    return ok(withAction({
      ...state,
      players: newPlayers,
      deck: result.deck,
    }, { type: "stack", seat, handIndex, card: stackCard, success: false }));
  }

  const newDeck = addToDiscardPile(state.deck, stackCard);
  const newPlayers = new Map(state.players);
  const newPlayer = removeCard(player, handIndex);
  newPlayers.set(seat, newPlayer);
  const action = { type: "stack", seat, handIndex, card: stackCard, success: true } as const;

  // Start counting points if onew player has zero cards
  if (newPlayer.hand.length === 0) {
    return ok(withAction({
      ...state,
      deck: newDeck,
      players: newPlayers,
      canStack: false,
      peek: null,
      phase: "scoring",
    }, action));
  }

  const newState: GameState = {
    ...state,
    deck: newDeck,
    players: newPlayers,
    canStack: false,
  };

  return ok(withAction(newState, action));
}

export function jackPower(
  state: GameState,
  powerOwnerSeat: number,
  seat1: number,
  seat2: number,
  handIndex1: number,
  handIndex2: number
): GameResult {
  const p1 = state.players.get(seat1), p2 = state.players.get(seat2);

  // Checks
  if (state.phase !== "power_jack" || state.turnIndex !== powerOwnerSeat) return fail("Forbidden move");
  if (seat1 === seat2) return fail("Cannot switch cards from the same hand");
  if (!p1 || !p2) return fail("Players not found");

  const cardp1 = p1.hand[handIndex1], cardp2 = p2.hand[handIndex2];
  if (!cardp1 || !cardp2) return fail("Invalid move");

  //Logic
  const h1 = [...p1.hand];
  const h2 = [...p2.hand];
  h1[handIndex1] = cardp2;
  h2[handIndex2] = cardp1;

  const newPlayers = new Map(state.players);
  newPlayers.set(seat1, {...p1, hand: h1});
  newPlayers.set(seat2, {...p2, hand: h2});

  const newState: GameState = finishTurn({
    ...state,
    players: newPlayers,
  });

  return ok(withAction(newState, {
    type: "jack",
    seat: powerOwnerSeat,
    seat1,
    i1: handIndex1,
    seat2,
    i2: handIndex2,
  }));
}

export function queenPower(
  state: GameState,
  seat: number,
  targetSeat: number,
  handIndex: number,
): GameResult {
  const player = state.players.get(seat);
  const target = state.players.get(targetSeat);

  // Checks
  if (seat !== state.turnIndex) return fail("Forbidden move");
  if (state.phase !== "power_queen") return fail("No queen power to execute");
  if (!player) return fail("Player not found");
  if (!target?.hand[handIndex]) return fail("Invalid target card");

  // Logic
  const newState: GameState = {
    ...state,
    phase: "peeking",
    peek: {
      peeker: seat,
      targetSeat,
      handIndex,
    }
  };

  // Everyone sees which card is peeked, only the peeker sees its value
  return ok(withAction(newState, { type: "queen", seat, targetSeat, handIndex }));
}

export function dutch(state: GameState, seat: number): GameResult {
  const player = state.players.get(seat);

  // Checks
  if (seat !== state.turnIndex) return fail("Not your turn");
  if (state.phase !== "drawing") return fail("Cannot call dutch at this moment");
  if (state.dutch) return fail("Dutch already called");
  if (!player) return fail("Player not found");

  // Logic
  const newState: GameState = finishTurn({
    ...state,
    dutch: { seat },
  });

  return ok(withAction(newState, { type: "dutch", seat }));
}

// ================ Helper functions ==========================
export function finishTurn(state: GameState): GameState {
  const next = nextTurn(state);
  return { 
    ...state,
    turnIndex: next,
    phase: next === state.dutch?.seat ? "scoring" : "drawing"};
}

export function nextTurn(state: GameState): number {
  const seats = [...state.players.keys()].sort((a, b) => a - b);
  const i = seats.indexOf(state.turnIndex);
  return seats[(i + 1) % seats.length]!;
}

function phaseAfterCard(card: Card): Phase {
  switch (card.value) { 
    case 11: return "power_jack";
    case 12: return "power_queen";
    default: return "drawing";
  }
}

