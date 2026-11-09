import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AnimationLayer } from "../components/AnimationLayer.tsx";
import { ConfirmLeave } from "../components/ConfirmLeave.tsx";
import { Controls } from "../components/Controls.tsx";
import { Felt } from "../components/Felt.tsx";
import { Hand, type HandSlot } from "../components/Hand.tsx";
import { GameOver } from "../components/GameOver.tsx";
import { PlayerBadge } from "../components/PlayerBadge.tsx";
import { RoundSummary } from "../components/RoundSummary.tsx";
import { TableHeader } from "../components/TableHeader.tsx";
import { cardClick, pileClick, type Pick } from "../game/clicks.ts";
import { describeAction } from "../game/describe.ts";
import { promptFor } from "../game/prompt.ts";
import type { RoomView, RoundScore, SeatView } from "../game/protocol.ts";
import { handTotal } from "../game/scoring.ts";
import { isMyTurn, me, nameOf, seatsAroundTable } from "../game/selectors.ts";
import { useCountdown } from "../game/useCountdown.ts";
import { useGame } from "../game/useGame.ts";
import { useNow } from "../game/useNow.ts";

export function Table({ roomView }: { roomView: RoomView }) {
  const { state, actions } = useGame();
  const [jackPick, setJackPick] = useState<Pick | null>(null);
  const [stackMode, setStackMode] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [summary, setSummary] = useState<readonly RoundScore[] | null>(null);

  const { view } = roomView;
  const self = me(roomView);
  const myTurn = isMyTurn(roomView);
  const deciding = myTurn && view.phase === "deciding";
  const secondsLeft = useCountdown(roomView.deadline);
  const name = (seat: number) => nameOf(roomView, seat);
  // My seat in the room: set but out of the game = eliminated, null = watcher
  const mySeat = state.room?.seat ?? null;
  const eliminated = self === undefined && mySeat !== null && roomView.eliminated.includes(mySeat);
  const anyOffline = Object.values(roomView.connected).some(isConnected => !isConnected);
  const now = useNow(500, anyOffline);

  // A half-done Jack swap or a stack toggle must not outlive its moment
  useEffect(() => {
    if (view.phase !== "power_jack") setJackPick(null);
  }, [view.phase]);
  useEffect(() => {
    if (!deciding || !view.canStack) setStackMode(false);
  }, [deciding, view.canStack]);

  // A new round result opens the summary. Kept in state: the next round's
  // actions replace lastAction long before the summary closes
  // Keyed on actionSeq: views repeat lastAction, a dismissed summary must stay closed
  const { lastAction, actionSeq } = view;
  const shownSeq = useRef<number | null>(null);
  useEffect(() => {
    if (lastAction?.type !== "countPoints" || view.phase === "finished" || shownSeq.current === actionSeq) return;
    shownSeq.current = actionSeq;
    setSummary(lastAction.summary);
  }, [actionSeq, lastAction, view.phase]);
  const dismissSummary = useCallback(() => setSummary(null), []);

  // The reveal flips every hand in a wave around the table
  const revealOrder = view.players.findIndex(player => player.seat === view.you);
  const flipDelayFor = (player: SeatView, handIndex: number) => {
    if (view.phase !== "scoring") return 0;
    const position = (view.players.indexOf(player) - Math.max(0, revealOrder) + view.players.length) % view.players.length;
    return position * 300 + handIndex * 80;
  };

  const slotsFor = (player: SeatView): HandSlot[] =>
    player.hand.map((card, handIndex) => {
      const target = { seat: player.seat, handIndex };
      const click = cardClick(roomView, target, jackPick, stackMode);
      const peeked = view.phase === "peeking" && view.peek?.targetSeat === player.seat && view.peek.handIndex === handIndex;
      const picked = jackPick?.seat === player.seat && jackPick.handIndex === handIndex;

      return {
        // The peeker sees the peeked card flip face up in its slot
        card: peeked && view.peek?.card ? view.peek.card : card,
        selectable: peeked || (click.kind !== "none" && (view.phase === "power_jack" || view.phase === "power_queen" || stackMode)),
        selected: picked,
        flipDelay: flipDelayFor(player, handIndex),
        onClick: click.kind === "none" ? undefined : () => {
          if (click.kind === "pick") return setJackPick(click.pick);
          actions.move(click.move);
          setJackPick(null);
          setStackMode(false);
        },
      };
    });

  const badgeFor = (player: SeatView, isYou: boolean) => {
    const calledDutch = view.dutch?.seat === player.seat;
    const graceDeadline = roomView.graceDeadlines[player.seat];
    const offlineSeconds = roomView.connected[player.seat] === false && graceDeadline !== undefined
      ? Math.max(0, Math.ceil((graceDeadline - now) / 1000))
      : null;
    // The reveal: every hand is face up, show what it will cost
    const tag = view.phase === "scoring" ? `−${handTotal(player.hand)}` : calledDutch ? "DUTCH" : undefined;
    return (
      <PlayerBadge
        name={isYou ? `${name(player.seat)} (you)` : name(player.seat)}
        score={player.score}
        isActive={view.turnIndex === player.seat && view.phase !== "scoring"}
        isYou={isYou}
        offlineSeconds={offlineSeconds}
        tag={tag}
        tagTone={view.phase === "scoring" ? "out" : calledDutch ? "dutch" : undefined}
      />
    );
  };

  const drawPile = pileClick(roomView, "drawPile");
  const discardPile = pileClick(roomView, "discardPile");
  const holder = view.players.find(player => player.hasDrawnCard);
  const drawn = holder === undefined ? null : holder.drawnCard ?? "hidden";

  const seats = seatsAroundTable(view.players, view.you);
  const opponents = seats.filter(entry => entry.position !== "self");
  const prompt = promptFor(roomView, jackPick, stackMode, eliminated);
  const lastMove = describeAction(view.lastAction, name, view.you);
  const showDutchBanner = view.dutch !== null && view.phase !== "scoring" && view.phase !== "finished";
  const spectators = [
    roomView.eliminated.length > 0 ? `Out: ${roomView.eliminated.map(name).join(", ")}` : "",
    roomView.watchers.length > 0 ? `Watching: ${roomView.watchers.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
  const finalSummary = lastAction?.type === "countPoints" ? lastAction.summary : null;

  return (
    <>
      <TableHeader
        code={roomView.code}
        turn={myTurn ? "YOU" : name(view.turnIndex).toUpperCase()}
        phase={view.phase}
        secondsLeft={secondsLeft}
        onLeave={() => setConfirmLeave(true)}
      />

      {showDutchBanner && view.dutch ? (
        <motion.div
          className="banner"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          Dutch called by {view.dutch.seat === view.you ? "you" : name(view.dutch.seat)}: one last turn each
        </motion.div>
      ) : null}

      {/* Always rendered, fixed height: an empty or longer line must not move the table */}
      <p className="last-move" aria-live="polite">
        <span className="last-move-text" title={lastMove ?? undefined}>{lastMove ?? ""}</span>
      </p>

      <div className="table">
        {opponents.map(({ player, position }) => (
          <div key={player.seat} className={`seat seat-opponent seat-${position}`}>
            {badgeFor(player, false)}
            <Hand owner={name(player.seat)} seat={player.seat} slots={slotsFor(player)} />
          </div>
        ))}

        <Felt
          drawPileCount={view.drawPileCount}
          topDiscard={view.topDiscard}
          drawn={drawn}
          onDrawPile={drawPile ? () => actions.move(drawPile) : undefined}
          onDiscardPile={discardPile ? () => actions.move(discardPile) : undefined}
        />

        <div className="seat seat-self">
          {spectators ? <p className="spectators">{spectators}</p> : null}
          <p className={`prompt${prompt.idle ? " prompt-idle" : ""}`}>{prompt.text}</p>
          {self === undefined ? (
            <p className="spectating">{eliminated ? "You're out: watching the rest of the game" : "Watching"}</p>
          ) : (
            <>
              <div className="self-row">
                {badgeFor(self, true)}
                <Hand owner="You" seat={self.seat} slots={slotsFor(self)} />
              </div>
              <Controls
                canCallDutch={myTurn && view.phase === "drawing" && view.dutch === null}
                deciding={deciding}
                fromDiscard={view.fromDiscard}
                canStack={view.canStack}
                stackMode={stackMode}
                onDutch={() => actions.move({ type: "dutch" })}
                onDiscard={() => actions.move({ type: "discard" })}
                onToggleStack={() => setStackMode(current => !current)}
              />
            </>
          )}
        </div>
      </div>

      <AnimationLayer prev={state.previousView} next={view} />
      {summary ? <RoundSummary summary={summary} nameOf={name} onDismiss={dismissSummary} /> : null}
      {view.phase === "finished" ? (
        <GameOver
          winners={view.players.map(player => player.seat)}
          you={view.you}
          summary={finalSummary}
          nameOf={name}
          onRematch={actions.rematch}
          onLeave={actions.leave}
        />
      ) : null}
      {confirmLeave ? <ConfirmLeave onLeave={actions.leave} onStay={() => setConfirmLeave(false)} /> : null}
    </>
  );
}
