import { useState } from "react";
import { ActionButton } from "../components/ActionButton.tsx";
import { PlayerBadge } from "../components/PlayerBadge.tsx";
import type { RoomView } from "../game/protocol.ts";
import { me, nameOf } from "../game/selectors.ts";
import { useGame } from "../game/useGame.ts";

const MIN_TO_START = 2;

export function Lobby({ roomView }: { roomView: RoomView }) {
  const { actions } = useGame();
  const [copied, setCopied] = useState(false);

  const { players, maxPlayers } = roomView.view;
  const self = me(roomView);
  const isWatcher = self === undefined;
  const everyoneReady = players.every(player => player.isReady);
  const canStart = !isWatcher && players.length >= MIN_TO_START && everyoneReady;
  const freeSeats = Math.max(0, maxPlayers - players.length);

  const copyLink = () => {
    const link = `${window.location.origin}/?room=${roomView.code}`;
    void navigator.clipboard?.writeText(link)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  };

  return (
    <div className="centered">
      <div>
        <h1 className="logo">Dutch</h1>
        <p className="tagline">Waiting room</p>
      </div>

      <div className="panel panel-wide">
        <div className="code-card">
          <span className="eyebrow">Room code</span>
          <div className="room-code">{roomView.code}</div>
          <ActionButton variant="ghost" onClick={copyLink}>{copied ? "LINK COPIED" : "COPY LINK"}</ActionButton>
        </div>

        <div>
          <span className="eyebrow">At the table — {players.length}/{maxPlayers}</span>
          <ul className="roster" style={{ marginTop: "var(--space-3)" }}>
            {players.map(player => {
              const isYou = player.seat === self?.seat;
              return (
                <li key={player.seat}>
                  <PlayerBadge
                    name={isYou ? `${nameOf(roomView, player.seat)} (you)` : nameOf(roomView, player.seat)}
                    score={player.score}
                    tag={player.isReady ? "READY" : "NOT READY"}
                    tagTone={player.isReady ? "ready" : "muted"}
                  />
                </li>
              );
            })}
            {Array.from({ length: freeSeats }, (_, index) => (
              <li key={`empty-${index}`}>
                <div className="seat-empty">EMPTY SEAT</div>
              </li>
            ))}
          </ul>
        </div>

        {roomView.watchers.length > 0 ? (
          <div>
            <span className="eyebrow">Watching</span>
            <div className="watchers" style={{ marginTop: "var(--space-2)" }}>
              {roomView.watchers.map((name, index) => <span key={`${name}-${index}`} className="watcher-chip">{name}</span>)}
            </div>
          </div>
        ) : null}

        <div className="row">
          {isWatcher ? (
            <ActionButton onClick={actions.sit} disabled={freeSeats === 0}>TAKE A SEAT</ActionButton>
          ) : (
            // One way: the game has no "unready"
            <ActionButton onClick={() => actions.move({ type: "ready" })} disabled={self.isReady}>
              {self.isReady ? "READY ✓" : "I'M READY"}
            </ActionButton>
          )}
          {isWatcher ? null : (
            <ActionButton variant="primary" onClick={() => actions.move({ type: "start" })} disabled={!canStart}>
              DEAL THE ROUND
            </ActionButton>
          )}
        </div>

        <p className="hint">{lobbyHint(isWatcher, freeSeats, self?.isReady ?? false, players.length, everyoneReady)}</p>

        <ActionButton variant="ghost" onClick={actions.leave}>LEAVE</ActionButton>
      </div>
    </div>
  );
}

// ========= Helper functions =============
function lobbyHint(isWatcher: boolean, freeSeats: number, ready: boolean, count: number, everyoneReady: boolean): string {
  if (isWatcher) return freeSeats > 0 ? "A seat is free: take it to play." : "The table is full, you're watching.";
  if (!ready) return "Ready up when you're set. You can't undo it.";
  if (count < MIN_TO_START) return `Need at least ${MIN_TO_START} players to deal.`;
  if (!everyoneReady) return "Waiting for everyone to be ready…";
  return "Everyone's ready: anyone can deal.";
}
