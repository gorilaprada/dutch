import { useEffect, useState } from "react";
import { Controls } from "../components/Controls.tsx";
import { Felt } from "../components/Felt.tsx";
import { Hand, type HandSlot } from "../components/Hand.tsx";
import { PlayerBadge } from "../components/PlayerBadge.tsx";
import { TableHeader } from "../components/TableHeader.tsx";
import { cardClick, pileClick, type Pick } from "../game/clicks.ts";
import { describeAction } from "../game/describe.ts";
import { promptFor } from "../game/prompt.ts";
import type { RoomView, SeatView } from "../game/protocol.ts";
import { isMyTurn, me, nameOf, seatsAroundTable } from "../game/selectors.ts";
import { useCountdown } from "../game/useCountdown.ts";
import { useGame } from "../game/useGame.ts";

export function Table({ roomView }: { roomView: RoomView }) {
  const { actions } = useGame();
  const [jackPick, setJackPick] = useState<Pick | null>(null);
  const [stackMode, setStackMode] = useState(false);

  const { view } = roomView;
  const self = me(roomView);
  const myTurn = isMyTurn(roomView);
  const deciding = myTurn && view.phase === "deciding";
  const secondsLeft = useCountdown(roomView.deadline);
  const name = (seat: number) => nameOf(roomView, seat);

  // A half-done Jack swap or a stack toggle must not outlive its moment
  useEffect(() => {
    if (view.phase !== "power_jack") setJackPick(null);
  }, [view.phase]);
  useEffect(() => {
    if (!deciding || !view.canStack) setStackMode(false);
  }, [deciding, view.canStack]);

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
    return (
      <PlayerBadge
        name={isYou ? `${name(player.seat)} (you)` : name(player.seat)}
        score={player.score}
        isActive={view.turnIndex === player.seat && view.phase !== "scoring"}
        tag={calledDutch ? "DUTCH" : undefined}
        tagTone={calledDutch ? "dutch" : undefined}
      />
    );
  };

  const drawPile = pileClick(roomView, "drawPile");
  const discardPile = pileClick(roomView, "discardPile");
  const holder = view.players.find(player => player.hasDrawnCard);
  const drawn = holder === undefined ? null : holder.drawnCard ?? "hidden";

  const seats = seatsAroundTable(view.players, view.you);
  const opponents = seats.filter(entry => entry.position !== "self");
  const prompt = promptFor(roomView, jackPick, stackMode);
  const lastMove = describeAction(view.lastAction, name, view.you);
  const showDutchBanner = view.dutch !== null && view.phase !== "scoring" && view.phase !== "finished";

  return (
    <>
      <TableHeader code={roomView.code} turn={myTurn ? "YOU" : name(view.turnIndex).toUpperCase()} phase={view.phase} secondsLeft={secondsLeft} />

      {showDutchBanner && view.dutch ? (
        <div className="banner">
          Dutch called by {view.dutch.seat === view.you ? "you" : name(view.dutch.seat)}: one last turn each
        </div>
      ) : null}

      {lastMove ? <p className="last-move" aria-live="polite">{lastMove}</p> : null}

      <div className="table">
        {opponents.map(({ player, position }) => (
          <div key={player.seat} className={`seat seat-opponent seat-${position}`}>
            {badgeFor(player, false)}
            <Hand owner={name(player.seat)} slots={slotsFor(player)} />
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
          <p className={`prompt${prompt.idle ? " prompt-idle" : ""}`}>{prompt.text}</p>
          {self === undefined ? (
            <p className="spectating">Watching</p>
          ) : (
            <>
              <div className="self-row">
                {badgeFor(self, true)}
                <Hand owner="You" slots={slotsFor(self)} />
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
    </>
  );
}
