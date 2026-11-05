import type { Card } from "../game/protocol.ts";
import { PlayingCard } from "./PlayingCard.tsx";

type FeltProps = {
  drawPileCount: number;
  topDiscard: Card | null;
  // My own drawn card face up; "hidden" = someone else holds one; null = none
  drawn: Card | "hidden" | null;
  onDrawPile?: () => void;
  onDiscardPile?: () => void;
};

export function Felt({ drawPileCount, topDiscard, drawn, onDrawPile, onDiscardPile }: FeltProps) {
  return (
    <div className="felt">
      <PlayingCard card={null} label={`DECK · ${drawPileCount}`} onClick={onDrawPile} ariaLabel="Deck" />
      <PlayingCard
        card={topDiscard}
        empty={topDiscard === null}
        emptyLabel="EMPTY"
        label="DISCARD"
        onClick={onDiscardPile}
        ariaLabel={topDiscard ? undefined : "Discard pile (empty)"}
      />
      <PlayingCard
        card={drawn === "hidden" ? null : drawn}
        empty={drawn === null}
        emptyLabel="—"
        label="DRAWN"
        ariaLabel={drawn === null ? "No drawn card" : drawn === "hidden" ? "Drawn card (face down)" : undefined}
      />
    </div>
  );
}
