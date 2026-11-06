export type BadgeTone = "active" | "out" | "dutch" | "ready" | "muted";

type PlayerBadgeProps = {
  name: string;
  score: number;
  isActive?: boolean;
  // The viewer's own badge: the turn tag reads YOUR TURN
  isYou?: boolean;
  isEliminated?: boolean;
  // Disconnected, seat held: dimmed with an OFFLINE countdown
  offlineSeconds?: number | null;
  // Overrides the turn/out tag: YOU, READY, DUTCH...
  tag?: string;
  tagTone?: BadgeTone;
};

export function PlayerBadge({
  name,
  score,
  isActive = false,
  isYou = false,
  isEliminated = false,
  offlineSeconds = null,
  tag,
  tagTone,
}: PlayerBadgeProps) {
  const offline = offlineSeconds !== null;
  const resolvedTag = offline
    ? `OFFLINE ${offlineSeconds}s`
    : tag ?? (isEliminated ? "OUT" : isActive ? (isYou ? "YOUR TURN" : "THEIR TURN") : " ");
  const tone = offline ? "out" : tagTone ?? (isEliminated ? "out" : isActive ? "active" : "muted");

  const classes = [
    "badge",
    isActive && !isEliminated ? "badge-active" : "",
    isEliminated || offline ? "badge-eliminated" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="badge-name" title={name}>{name}</div>
      <div className="badge-score">{score}</div>
      <div className={`badge-tag${tone === "muted" ? "" : ` badge-tag-${tone}`}`}>{resolvedTag}</div>
    </div>
  );
}
