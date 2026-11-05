import type { RoomView } from "../game/protocol.ts";

// Stand-in until the game table (Feature 10)
export function TablePlaceholder({ roomView }: { roomView: RoomView }) {
  return (
    <div className="centered">
      <h1 className="headline">Table</h1>
      <p className="hint">Room {roomView.code} · phase {roomView.view.phase}</p>
    </div>
  );
}
