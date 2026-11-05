import type { GameResult, GameState, PlayerView, ViewResult } from "./types.ts";

export function ok(state: GameState): GameResult {
  return { ok: true, state };
}

export function fail(error: string): GameResult {
  return { ok: false, error };
}

export function okView(view: PlayerView): ViewResult {
  return { ok: true, view };
}

export function failView(error: string): ViewResult {
  return { ok: false, error };
}
