import type { PlayerView, RoundScore } from "../../src/entrypoint.ts";

// What every socket in a room receives after each change
export type RoomView = Readonly<{
  code: string;
  names: Readonly<Record<number, string>>; // seat -> name, seated sessions only
  connected: Readonly<Record<number, boolean>>; // seat -> socket attached
  graceDeadlines: Readonly<Record<number, number>>; // disconnected seat -> epoch ms
  watchers: readonly string[]; // names of watch-only sessions (no seat)
  eliminated: readonly number[]; // seats no longer in the game, now spectating
  view: PlayerView;
  deadline: number | null; // epoch ms when the current timed phase (or round break) ends
  // Between rounds: the scores, and who clicked READY FOR NEXT ROUND.
  // The view stays on the scoring reveal until the break ends
  roundBreak: Readonly<{ summary: readonly RoundScore[]; ready: readonly number[] }> | null;
}>;

export type ClientToServerEvents = {
  createRoom: (payload: unknown) => void;
  joinRoom: (payload: unknown) => void;
  resume: (payload: unknown) => void;
  move: (payload: unknown) => void;
  rematch: () => void; // only once the game is finished
  nextRoundReady: () => void; // only during a round break, players of the next round
  sit: () => void; // a watcher takes a free seat in the lobby
};

export type ServerToClientEvents = {
  // token: keep it to resume the seat after a reconnect
  // seat null = watcher. Sent again when the seat changes (sit, rematch)
  roomJoined: (payload: { code: string; seat: number | null; token: string }) => void;
  roomError: (message: string) => void;
  moveError: (message: string) => void;
  view: (payload: RoomView) => void;
};

export type InterServerEvents = Record<string, never>;

// Set once a socket has created, joined or resumed a room
export type SocketData = {
  code?: string;
  seat?: number;
  token?: string;
};
