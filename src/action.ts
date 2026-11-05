import type { Action, GameState } from "./types.ts";

export function withAction(state: GameState, action: Action): GameState {
  return {
    ...state,
    lastAction: action,
    actionSeq: state.actionSeq + 1,
  };
}
