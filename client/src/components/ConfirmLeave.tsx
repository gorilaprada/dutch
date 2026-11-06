import { ActionButton } from "./ActionButton.tsx";

export function ConfirmLeave({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-label="Leave the game">
      <div className="overlay-panel">
        <h2 className="headline headline-sm">Leave the game?</h2>
        <p className="summary-message">You lose your seat and can't come back to this game.</p>
        <div className="row">
          <ActionButton variant="ghost" onClick={onStay}>STAY</ActionButton>
          <ActionButton onClick={onLeave}>LEAVE</ActionButton>
        </div>
      </div>
    </div>
  );
}
