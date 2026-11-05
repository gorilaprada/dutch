export type BadgeTone = "active" | "out" | "dutch" | "ready" | "muted";

type PlayerBadgeProps = {
  name: string;
  score: number;
  isActive?: boolean;
  isEliminated?: boolean;
  // Overrides the turn/out tag: YOU, READY, DUTCH...
  tag?: string;
  tagTone?: BadgeTone;
};

export function PlayerBadge({
  name,
  score,
  isActive = false,
  isEliminated = false,
  tag,
  tagTone,
}: PlayerBadgeProps) {
  const resolvedTag = tag ?? (isEliminated ? "OUT" : isActive ? "THEIR TURN" : " ");
  const tone = tagTone ?? (isEliminated ? "out" : isActive ? "active" : "muted");

  const classes = [
    "badge",
    isActive && !isEliminated ? "badge-active" : "",
    isEliminated ? "badge-eliminated" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="badge-name" title={name}>{name}</div>
      <div className="badge-score">{score}</div>
      <div className={`badge-tag${tone === "muted" ? "" : ` badge-tag-${tone}`}`}>{resolvedTag}</div>
    </div>
  );
}
