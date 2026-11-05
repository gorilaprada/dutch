import type { Phase } from "../game/protocol.ts";

const COUNTDOWN_LABEL: Partial<Record<Phase, string>> = {
  memorizing: "Memorize",
  peeking: "Peek",
  scoring: "Reveal",
};

type TableHeaderProps = {
  code: string;
  turn: string; // YOU or a name
  phase: Phase;
  secondsLeft: number | null;
};

export function TableHeader({ code, turn, phase, secondsLeft }: TableHeaderProps) {
  const countdown = COUNTDOWN_LABEL[phase];
  return (
    <header className="table-header">
      <span className="wordmark">DUTCH</span>
      <div className="header-meta">
        <div className="meta">
          <span className="eyebrow">Room</span>
          <span className="meta-value">{code}</span>
        </div>
        <div className="meta">
          <span className="eyebrow">Turn</span>
          <span className="meta-value">{turn}</span>
        </div>
        {countdown && secondsLeft !== null ? (
          <div className="memorize">
            <span className="eyebrow">{countdown}</span>
            <span className="memorize-count" aria-label={`${countdown} countdown`}>{secondsLeft}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
