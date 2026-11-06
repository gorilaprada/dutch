import { useEffect } from "react";
import type { RoundScore } from "../game/protocol.ts";
import { ActionButton } from "./ActionButton.tsx";

// The next round is dealt the moment this one is scored, so the summary
// floats over the table instead of covering it, and goes away on its own
const AUTO_DISMISS_MS = 8000;

type RoundSummaryProps = {
  summary: readonly RoundScore[];
  nameOf: (seat: number) => string;
  onDismiss: () => void;
};

export function RoundSummary({ summary, nameOf, onDismiss }: RoundSummaryProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [summary, onDismiss]);

  const out = summary.filter(result => result.eliminated);

  return (
    <aside className="summary-float" role="status" aria-label="Round summary">
      <h2 className="headline headline-sm">Round over</h2>
      <ScoreList summary={summary} nameOf={nameOf} />
      {out.map(result => (
        <p key={result.seat} className="summary-message">{nameOf(result.seat)} is out!</p>
      ))}
      <ActionButton variant="ghost" onClick={onDismiss}>DISMISS</ActionButton>
    </aside>
  );
}

export function ScoreList({ summary, nameOf }: { summary: readonly RoundScore[]; nameOf: (seat: number) => string }) {
  return (
    <ul className="summary-list">
      {summary.map(result => (
        <li key={result.seat} className={`summary-row${result.eliminated ? " summary-row-out" : ""}`}>
          <span>{nameOf(result.seat)}</span>
          <span className="summary-delta">−{result.pointsLost}</span>
          <span className="summary-total">{result.score}</span>
        </li>
      ))}
    </ul>
  );
}
