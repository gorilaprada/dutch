import type { RoundScore } from "../game/protocol.ts";
import { ActionButton } from "./ActionButton.tsx";

// Shown during the server's round break, over the revealed hands. It closes
// when the next round is dealt: after the break, or once everyone is ready
type RoundSummaryProps = {
  summary: readonly RoundScore[];
  ready: readonly number[]; // seats that clicked READY FOR NEXT ROUND
  waitingOn: readonly number[]; // seats the early start waits for (connected players of the next round)
  you: number | null; // my seat in the room, null = watcher
  secondsLeft: number | null;
  nameOf: (seat: number) => string;
  onReady: () => void;
};

export function RoundSummary({ summary, ready, waitingOn, you, secondsLeft, nameOf, onReady }: RoundSummaryProps) {
  const out = summary.filter(result => result.eliminated);
  // Only players of the next round can get ready: not watchers, not the eliminated
  const playing = you !== null && summary.some(result => result.seat === you && !result.eliminated);
  const imReady = you !== null && ready.includes(you);
  const readyCount = waitingOn.filter(seat => ready.includes(seat)).length;

  return (
    <aside className="summary-float" role="status" aria-label="Round summary">
      <h2 className="headline headline-sm">Round over</h2>
      <ScoreList summary={summary} nameOf={nameOf} ready={ready} />
      {out.map(result => (
        <p key={result.seat} className="summary-message">{nameOf(result.seat)} is out!</p>
      ))}
      {playing ? (
        <ActionButton variant="primary" onClick={onReady} disabled={imReady}>
          {imReady ? `WAITING… ${readyCount}/${waitingOn.length} READY` : "READY FOR NEXT ROUND"}
        </ActionButton>
      ) : null}
      <p className="hint" aria-live="polite">
        {secondsLeft === null ? "Next round starting…" : `Next round in ${secondsLeft}s`}
      </p>
    </aside>
  );
}

type ScoreListProps = {
  summary: readonly RoundScore[];
  nameOf: (seat: number) => string;
  ready?: readonly number[]; // ticks players who are ready for the next round
};

export function ScoreList({ summary, nameOf, ready }: ScoreListProps) {
  return (
    <ul className="summary-list">
      {summary.map(result => (
        <li key={result.seat} className={`summary-row${result.eliminated ? " summary-row-out" : ""}`}>
          <span className="summary-name">
            {nameOf(result.seat)}
            {ready?.includes(result.seat) ? <span className="summary-ready" aria-label="ready"> ✓</span> : null}
          </span>
          <span className="summary-delta">−{result.pointsLost}</span>
          <span className="summary-total">{result.score}</span>
        </li>
      ))}
    </ul>
  );
}
