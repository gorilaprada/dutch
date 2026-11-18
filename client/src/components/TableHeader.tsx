import type { Phase } from "../game/protocol.ts";
import { ActionButton } from "./ActionButton.tsx";

// roundBreak: the server's pause between rounds, while the scores are up
type Step = Phase | "roundBreak";

const COUNTDOWN_LABEL: Partial<Record<Step, string>> = {
  memorizing: "Memorize",
  peeking: "Peek",
  scoring: "Reveal",
  roundBreak: "Next round",
};

type TableHeaderProps = {
  code: string;
  turn: string; // YOU or a name
  phase: Step;
  secondsLeft: number | null;
  onLeave: () => void;
};

export function TableHeader({ code, turn, phase, secondsLeft, onLeave }: TableHeaderProps) {
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
        <ActionButton variant="ghost" onClick={onLeave}>LEAVE</ActionButton>
      </div>
    </header>
  );
}
