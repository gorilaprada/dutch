import type { RoomView, SeatView } from "./protocol.ts";

export type TablePosition = "self" | "left" | "top" | "right";

// Positions around the table, starting with the bottom seat
const LAYOUTS: Record<number, TablePosition[]> = {
  1: ["self"],
  2: ["self", "top"],
  3: ["self", "left", "right"],
  4: ["self", "left", "top", "right"],
};

export function me(roomView: RoomView): SeatView | undefined {
  const { you, players } = roomView.view;
  return you === null ? undefined : players.find(player => player.seat === you);
}

export function isSpectator(roomView: RoomView): boolean {
  return me(roomView) === undefined;
}

export function isMyTurn(roomView: RoomView): boolean {
  return !isSpectator(roomView) && roomView.view.turnIndex === roomView.view.you;
}

export function nameOf(roomView: RoomView, seat: number): string {
  return roomView.names[seat] ?? `Seat ${seat + 1}`;
}

// Me at the bottom, everyone else in turn order from there. A spectator has
// no seat: the bottom stays empty and the players fill the others
export function seatsAroundTable(
  players: readonly SeatView[],
  you: number | null,
): { player: SeatView; position: TablePosition }[] {
  const start = players.findIndex(player => player.seat === you);
  const spectating = start === -1;
  const ordered = spectating ? players : [...players.slice(start), ...players.slice(0, start)];
  const layout = LAYOUTS[Math.min(spectating ? ordered.length + 1 : ordered.length, 4)] ?? [];
  const positions = spectating ? layout.slice(1) : layout;

  return ordered.map((player, index) => ({ player, position: positions[index] ?? "top" }));
}
