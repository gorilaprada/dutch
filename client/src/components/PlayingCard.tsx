import { cardLabel, isPowerCard, isRedSuit, rankLabel } from "../game/cards.ts";
import type { Card } from "../game/protocol.ts";

type PlayingCardProps = {
  // null = face down: the server sends no data at all for a hidden card
  card: Card | null;
  // An empty slot (empty pile, no drawn card) instead of a card
  empty?: boolean;
  emptyLabel?: string;
  label?: string;
  onClick?: () => void;
  // Waiting for this card to be picked (stack / jack / queen)
  selectable?: boolean;
  // Already picked: the first half of a Jack swap
  selected?: boolean;
  ariaLabel?: string;
};

export function PlayingCard({
  card,
  empty = false,
  emptyLabel = "",
  label,
  onClick,
  selectable = false,
  selected = false,
  ariaLabel,
}: PlayingCardProps) {
  const face = empty ? null : card;
  const classes = [
    "card",
    empty ? "card-empty" : face ? "card-face" : "card-facedown",
    face && isRedSuit(face.suit) ? "card-red" : "",
    face && isPowerCard(face) ? "card-power" : "",
    selectable ? "card-selectable" : "",
    selected ? "card-selected" : "",
    onClick ? "card-clickable" : "",
  ].filter(Boolean).join(" ");

  const body = empty
    ? <span className="card-stack-label">{emptyLabel}</span>
    : face
      ? <FaceContent card={face} />
      : null;

  const described = ariaLabel ?? (empty ? emptyLabel || "empty slot" : face ? cardLabel(face) : "face-down card");

  return (
    <div className="card-slot">
      {onClick
        ? <button type="button" className={classes} onClick={onClick} aria-label={described}>{body}</button>
        : <div className={classes} aria-label={described} role="img">{body}</div>}
      {label === undefined ? null : <span className="card-stack-label">{label}</span>}
    </div>
  );
}

function FaceContent({ card }: { card: Card }) {
  const corner = `${rankLabel(card.value)}${card.suit}`;
  return (
    <>
      {isPowerCard(card) ? <span className="card-tag">POWER</span> : null}
      <span className="card-rank">{corner}</span>
      <span className="card-suit">{card.suit}</span>
      <span className="card-rank card-rank-bottom">{corner}</span>
    </>
  );
}
