import { slotKey } from "../game/animations.ts";
import type { Card } from "../game/protocol.ts";
import { PlayingCard } from "./PlayingCard.tsx";

export type HandSlot = {
  card: Card | null; // null = face down
  onClick?: () => void;
  selectable?: boolean; // waiting to be picked, or the slot being peeked
  selected?: boolean; // the Jack's first pick
  flipDelay?: number; // the reveal wave
};

export function Hand({ owner, seat, slots }: { owner: string; seat: number; slots: readonly HandSlot[] }) {
  return (
    <div className="hand" data-hand={seat}>
      {slots.map((slot, handIndex) => (
        <PlayingCard
          key={handIndex}
          card={slot.card}
          onClick={slot.onClick}
          selectable={slot.selectable}
          selected={slot.selected}
          flipDelay={slot.flipDelay}
          slot={slotKey({ kind: "hand", seat, handIndex })}
          ariaLabel={`${owner}, card ${handIndex + 1}${slot.card ? "" : " (face down)"}`}
        />
      ))}
    </div>
  );
}
