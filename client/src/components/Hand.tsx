import type { Card } from "../game/protocol.ts";
import { PlayingCard } from "./PlayingCard.tsx";

export type HandSlot = {
  card: Card | null; // null = face down
  onClick?: () => void;
  selectable?: boolean; // waiting to be picked, or the slot being peeked
  selected?: boolean; // the Jack's first pick
};

export function Hand({ owner, slots }: { owner: string; slots: readonly HandSlot[] }) {
  return (
    <div className="hand">
      {slots.map((slot, handIndex) => (
        <PlayingCard
          key={handIndex}
          card={slot.card}
          onClick={slot.onClick}
          selectable={slot.selectable}
          selected={slot.selected}
          ariaLabel={`${owner}, card ${handIndex + 1}${slot.card ? "" : " (face down)"}`}
        />
      ))}
    </div>
  );
}
