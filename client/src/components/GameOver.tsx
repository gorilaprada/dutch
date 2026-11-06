import type { RoundScore } from "../game/protocol.ts";
import { ActionButton } from "./ActionButton.tsx";
import { ScoreList } from "./RoundSummary.tsx";

type GameOverProps = {
  winners: readonly number[]; // seats still in the game (a tie can leave several)
  you: number | null;
  summary: readonly RoundScore[] | null; // null when the others left instead
  nameOf: (seat: number) => string;
  onRematch: () => void;
  onLeave: () => void;
};

export function GameOver({ winners, you, summary, nameOf, onRematch, onLeave }: GameOverProps) {
  const youWon = you !== null && winners.includes(you);
  const others = winners.filter(seat => seat !== you).map(nameOf);
  const headline = youWon
    ? others.length > 0 ? `You tie with ${others.join(", ")}` : "You win"
    : `${others.join(" & ")} ${winners.length > 1 ? "win" : "wins"}`;

  return (
    <div className="overlay" role="dialog" aria-label="Game over">
      <div className="overlay-panel">
        <h2 className="headline">{headline}</h2>
        {summary ? <ScoreList summary={summary} nameOf={nameOf} /> : <p className="summary-message">Everyone else left.</p>}
        <div className="row">
          <ActionButton variant="primary" onClick={onRematch}>REMATCH</ActionButton>
          <ActionButton variant="ghost" onClick={onLeave}>LEAVE</ActionButton>
        </div>
      </div>
    </div>
  );
}
