import { ActionButton } from "./ActionButton.tsx";

type ControlsProps = {
  canCallDutch: boolean;
  deciding: boolean; // my turn, holding a drawn card
  fromDiscard: boolean;
  canStack: boolean;
  stackMode: boolean;
  onDutch: () => void;
  onDiscard: () => void;
  onToggleStack: () => void;
};

export function Controls(props: ControlsProps) {
  const { canCallDutch, deciding, fromDiscard, canStack, stackMode } = props;
  return (
    <div className="controls">
      <ActionButton
        variant="primary"
        onClick={props.onDutch}
        disabled={!canCallDutch}
        title="End the round: everyone else gets one more turn"
      >
        CALL DUTCH
      </ActionButton>
      {/* Takers keepers: a card taken from the discard pile can't go straight back */}
      {fromDiscard && deciding ? null : (
        <ActionButton variant="ghost" onClick={props.onDiscard} disabled={!deciding} title="Discard the card you drew">
          DISCARD
        </ActionButton>
      )}
      {/* While deciding a click switches, so stacking needs this toggle. Otherwise a click stacks */}
      <ActionButton
        variant="secondary"
        onClick={props.onToggleStack}
        pressed={stackMode}
        disabled={!deciding || !canStack}
        title="Stack a matching card from your hand instead of switching"
      >
        {stackMode ? "CANCEL STACK" : "STACK"}
      </ActionButton>
    </div>
  );
}
