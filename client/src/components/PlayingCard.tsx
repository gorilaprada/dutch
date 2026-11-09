import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { FLIGHT_MS } from "../game/animations.ts";
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
  // Where the animation layer finds this card (see slotKey)
  slot?: string;
  // Delay before a face up / face down flip, for the reveal wave
  flipDelay?: number;
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
  slot,
  flipDelay = 0,
}: PlayingCardProps) {
  const face = empty ? null : card;
  const classes = [
    cardClasses(face, empty),
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

  // Flip only when the side changes after the first render, not on mount
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const side = empty ? "empty" : face ? "up" : "down";

  return (
    <div className="card-slot" data-slot={slot}>
      <motion.div
        key={side}
        className="card-flip"
        initial={mounted.current && side !== "empty" ? { rotateY: 90, opacity: 0.4 } : false}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: FLIGHT_MS / 2000, delay: flipDelay / 1000, ease: "easeOut" }}
      >
        {onClick
          ? <button type="button" className={classes} onClick={onClick} aria-label={described}>{body}</button>
          : <div className={classes} aria-label={described} role="img">{body}</div>}
      </motion.div>
      {label === undefined ? null : <span className="card-stack-label">{label}</span>}
    </div>
  );
}

// The look of a card without any behaviour: shared with the flying ghost cards
export function cardClasses(face: Card | null, empty = false): string {
  return [
    "card",
    empty ? "card-empty" : face ? "card-face" : "card-facedown",
    face && isRedSuit(face.suit) ? "card-red" : "",
    face && isPowerCard(face) ? "card-power" : "",
  ].filter(Boolean).join(" ");
}

export function FaceContent({ card }: { card: Card }) {
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
