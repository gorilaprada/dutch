import type { Card, RoomView, SeatView } from "../src/game/protocol.ts";

export function seat(seatNumber: number, overrides: Partial<SeatView> = {}): SeatView {
  return {
    seat: seatNumber,
    hand: [],
    hasDrawnCard: false,
    drawnCard: null,
    score: 50,
    isReady: false,
    ...overrides,
  };
}

// A lobby with Ana (seat 0, you) and Bob (seat 1) unless overridden
export function roomView(overrides: {
  code?: string;
  you?: number | null;
  players?: SeatView[];
  names?: Record<number, string>;
  watchers?: string[];
  phase?: RoomView["view"]["phase"];
  actionSeq?: number;
} = {}): RoomView {
  const players = overrides.players ?? [seat(0), seat(1)];
  return {
    code: overrides.code ?? "K7P9",
    names: overrides.names ?? { 0: "Ana", 1: "Bob", 2: "Cat", 3: "Dan" },
    connected: Object.fromEntries(players.map(p => [p.seat, true])),
    graceDeadlines: {},
    watchers: overrides.watchers ?? [],
    eliminated: [],
    deadline: null,
    view: {
      you: overrides.you === undefined ? 0 : overrides.you,
      players,
      drawPileCount: 52,
      topDiscard: null,
      turnIndex: 0,
      phase: overrides.phase ?? "lobby",
      fromDiscard: false,
      canStack: true,
      maxPlayers: 4,
      peek: null,
      dutch: null,
      lastAction: null,
      actionSeq: overrides.actionSeq ?? 1,
    },
  };
}

export function card(suit: Card["suit"], value: number): Card {
  return { id: `${suit}_${value}`, suit, value };
}

// A game in progress: Ana (seat 0, you) and Bob (seat 1), 4 face-down cards each
export function tableView(overrides: {
  you?: number | null;
  phase?: RoomView["view"]["phase"];
  turnIndex?: number;
  players?: SeatView[];
  view?: Partial<RoomView["view"]>;
  deadline?: number | null;
} = {}): RoomView {
  const base = roomView({
    you: overrides.you,
    phase: overrides.phase ?? "drawing",
    players: overrides.players ?? [
      seat(0, { hand: [null, null, null, null] }),
      seat(1, { hand: [null, null, null, null] }),
    ],
  });
  return {
    ...base,
    deadline: overrides.deadline ?? null,
    view: {
      ...base.view,
      turnIndex: overrides.turnIndex ?? 0,
      topDiscard: card("♡", 5),
      drawPileCount: 43,
      ...overrides.view,
    },
  };
}
