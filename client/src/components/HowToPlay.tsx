import type { ReactNode } from "react";
import { PlayingCard } from "./PlayingCard.tsx";
import { cardPoints } from "../game/scoring.ts";
import type { Card, Suit } from "../game/protocol.ts";

function demo(value: number, suit: Suit): Card {
  return { id: `demo_${suit}_${value}`, suit, value };
}

// Same cards as a real game, so new players learn what to look for
const VALUE_DEMO: readonly Card[] = [
  demo(1, "♡"),
  demo(7, "♧"),
  demo(13, "♢"),
  demo(13, "♤"),
];

const POWER_DEMO: readonly { card: Card; text: ReactNode }[] = [
  { card: demo(11, "♢"), text: <><strong>Jack</strong>: swap two cards between two different players.</> },
  { card: demo(12, "♤"), text: <><strong>Queen</strong>: peek at any one card.</> },
];

export function HowToPlay() {
  return (
    <details className="panel how-to" open>
      <summary className="panel-title how-to-summary">How to play</summary>

      <p className="how-to-text">
        Everyone starts with <strong>50 points</strong> and 4 face-down cards, and sees two of them at the
        start of each round. Each round you lose the points left in your hand. At 0 you're out, and the
        last player standing wins.
      </p>

      <section className="how-to-section" aria-label="Card values">
        <span className="eyebrow">Card values</span>
        <div className="how-to-cards">
          {VALUE_DEMO.map(card => (
            <PlayingCard key={card.id} card={card} label={`${cardPoints(card)} pts`} />
          ))}
        </div>
        <p className="hint">Ace is 1, Jack 11, Queen 12, King 13. <strong className="how-to-accent">Black Kings are worth 0.</strong></p>
      </section>

      <section className="how-to-section" aria-label="Special cards">
        <span className="eyebrow">Special cards</span>
        <p className="hint">Discard one to use its power. Look for the cyan glow.</p>
        <ul className="how-to-powers">
          {POWER_DEMO.map(({ card, text }) => (
            <li key={card.id} className="how-to-power">
              <PlayingCard card={card} />
              <span className="how-to-text">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="how-to-section" aria-label="Your turn">
        <span className="eyebrow">Your turn</span>
        <ol className="how-to-steps how-to-text">
          <li>Draw from the deck or the discard pile.</li>
          <li>Swap it into your hand, or discard it. A card from the discard pile can't go straight back.</li>
          <li>Anyone can <strong>stack</strong> a matching card on a fresh discard. A wrong stack costs a penalty card.</li>
          <li>Think your hand is lowest? Call <strong className="how-to-dutch">Dutch</strong> instead of drawing: everyone else gets one last turn.</li>
        </ol>
      </section>
    </details>
  );
}
