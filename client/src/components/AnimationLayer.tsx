import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { animationsFor, FLIGHT_MS, SHAKE_MS, slotKey, type SlotRef, type Tone } from "../game/animations.ts";
import type { Card, PlayerView } from "../game/protocol.ts";
import { cardClasses, FaceContent } from "./PlayingCard.tsx";

type Box = { left: number; top: number; width: number; height: number };

type Pending = { timers: number[]; hidden: HTMLElement[] };

type Flight = { id: number; from: Box; to: Box; card: Card | null; delay: number; duration: number; tone?: Tone };

// Ghost cards flying over the table. The views are already final: this only
// shows how we got there, and never blocks input
export function AnimationLayer({ prev, next }: { prev: PlayerView | null; next: PlayerView }) {
  const [flights, setFlights] = useState<readonly Flight[]>([]);
  const reduced = useReducedMotion() ?? false;
  const nextId = useRef(1);

  useLayoutEffect(() => {
    const animations = animationsFor(prev, next);
    if (animations.length === 0 || reduced) return;
    // Everything to undo when the next action arrives mid-flight
    const own: Pending = { timers: [], hidden: [] };

    const planned: Flight[] = [];
    for (const animation of animations) {
      if (animation.kind === "fly") {
        const from = measure(animation.from);
        const target = slotElement(animation.to);
        const to = target ? box(target) : null;
        if (!from || !to || !target) continue;
        const duration = animation.duration ?? FLIGHT_MS;
        // The real card stays invisible (still readable and clickable) until its ghost lands
        // The discard pile keeps its card: hiding it would leave a hole in the felt
        if (animation.to.kind !== "discard") hide(own, target.querySelector<HTMLElement>(".card") ?? target, animation.delay + duration);
        planned.push({ id: nextId.current++, from, to, card: animation.card, delay: animation.delay, duration, tone: animation.tone });
      } else {
        const target = slotElement(animation.at)?.querySelector<HTMLElement>(".card");
        if (!target) continue;
        const className = animation.kind === "shake" ? "card-shake" : "card-lift";
        target.classList.add(className);
        own.timers.push(window.setTimeout(() => target.classList.remove(className), animation.kind === "shake" ? SHAKE_MS : FLIGHT_MS * 2));
        if (animation.kind === "shake") {
          animate(target, { x: [0, -8, 8, -6, 6, 0] }, { duration: SHAKE_MS / 1000 });
        } else {
          animate(target, { y: [0, -14, -14, 0] }, { duration: (FLIGHT_MS * 2) / 1000 });
        }
      }
    }

    if (planned.length > 0) {
      setFlights(planned);
      const longest = Math.max(...planned.map(flight => flight.delay + flight.duration));
      own.timers.push(window.setTimeout(() => setFlights([]), longest + 50));
    }

    return () => {
      // A newer action (or leaving the table): snap everything to the end
      for (const timer of own.timers) window.clearTimeout(timer);
      for (const element of own.hidden) element.style.opacity = "";
      document.querySelectorAll(".card-shake, .card-lift").forEach(element => element.classList.remove("card-shake", "card-lift"));
      setFlights([]);
    };
    // Only a new action starts animations; prev changes together with it
  }, [next.actionSeq, reduced]);

  if (flights.length === 0) return null;
  return (
    <div className="flight-layer" aria-hidden="true" data-testid="flight-layer">
      {flights.map(flight => {
        const frames = flightFrames(flight.from, flight.to);
        return (
          <motion.div
            key={flight.id}
            className={`flight${flight.tone ? ` flight-${flight.tone}` : ""}`}
            style={frames.style}
            initial={frames.initial}
            animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
            transition={{ duration: flight.duration / 1000, delay: flight.delay / 1000, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={cardClasses(flight.card)}>{flight.card ? <FaceContent card={flight.card} /> : null}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ========= Helper functions =============
function slotElement(slot: SlotRef): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-slot="${slotKey(slot)}"]`);
}

// A card that just left a hand (a stack) may have no slot any more: start from the hand
function measure(slot: SlotRef): Box | null {
  const element = slotElement(slot) ?? (slot.kind === "hand" ? document.querySelector<HTMLElement>(`[data-hand="${slot.seat}"]`) : null);
  return element ? box(element.querySelector<HTMLElement>(".card") ?? element) : null;
}

// The ghost is laid out exactly like the card it lands on: same box, same
// --card-w, so its fonts match. It starts transformed onto the source card and
// moves with transforms only, so the text scales with the card the whole way
export function flightFrames(from: Box, to: Box) {
  return {
    style: {
      left: to.left,
      top: to.top,
      width: to.width,
      height: to.height,
      transformOrigin: "0 0",
      "--card-w": `${to.width}px`,
    } as CSSProperties,
    initial: {
      x: from.left - to.left,
      y: from.top - to.top,
      scaleX: to.width > 0 ? from.width / to.width : 1,
      scaleY: to.height > 0 ? from.height / to.height : 1,
    },
  };
}

// The card's untransformed size around its on-screen centre. A card that just
// changed side mounts mid-flip (rotateY 90deg): its bounding rect is a sliver,
// but a Y flip keeps the centre, and offset sizes ignore transforms
export function box(element: HTMLElement): Box {
  const card = element.querySelector<HTMLElement>(".card") ?? element;
  const rect = card.getBoundingClientRect();
  const width = card.offsetWidth || rect.width;
  const height = card.offsetHeight || rect.height;
  return {
    left: rect.left + rect.width / 2 - width / 2,
    top: rect.top + rect.height / 2 - height / 2,
    width,
    height,
  };
}

function hide(own: Pending, element: HTMLElement, ms: number): void {
  element.style.opacity = "0";
  own.hidden.push(element);
  own.timers.push(window.setTimeout(() => { element.style.opacity = ""; }, ms));
}
