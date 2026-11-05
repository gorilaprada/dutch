import { useContext } from "react";
import { GameContext, type Game } from "./GameProvider.tsx";

export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error("useGame must be used inside <GameProvider>");
  return game;
}
