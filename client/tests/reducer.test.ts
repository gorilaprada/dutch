import { describe, expect, test } from "vitest";
import { initialState, reducer, type GameStoreState } from "../src/game/reducer.ts";
import { roomView } from "./fixtures.ts";

const joined: GameStoreState = reducer(initialState, {
  type: "roomJoined",
  room: { code: "K7P9", seat: 0, token: "t1" },
});

describe("reducer", () => {
  test("roomJoined stores the room and ends a pending resume", () => {
    const resuming = reducer(initialState, { type: "resuming" });
    const next = reducer(resuming, { type: "roomJoined", room: { code: "K7P9", seat: null, token: "t" } });
    expect(next.room).toEqual({ code: "K7P9", seat: null, token: "t" });
    expect(next.resuming).toBe(false);
  });

  test("a new room drops the old view, the same room keeps it", () => {
    const withView = reducer(joined, { type: "view", roomView: roomView() });

    const sameRoom = reducer(withView, { type: "roomJoined", room: { code: "K7P9", seat: 2, token: "t1" } });
    expect(sameRoom.roomView).not.toBeNull();

    const otherRoom = reducer(withView, { type: "roomJoined", room: { code: "ZZZZ", seat: 0, token: "t2" } });
    expect(otherRoom.roomView).toBeNull();
  });

  test("views of another room, or older views, are ignored", () => {
    const withView = reducer(joined, { type: "view", roomView: roomView({ actionSeq: 5 }) });

    expect(reducer(withView, { type: "view", roomView: roomView({ code: "ZZZZ", actionSeq: 9 }) })).toBe(withView);
    expect(reducer(withView, { type: "view", roomView: roomView({ actionSeq: 4 }) })).toBe(withView);

    // Same seq is a real update (e.g. someone disconnected): accepted
    const sameSeq = roomView({ actionSeq: 5, watchers: ["Eve"] });
    expect(reducer(withView, { type: "view", roomView: sameSeq }).roomView).toBe(sameSeq);
  });

  test("a view before roomJoined is ignored", () => {
    expect(reducer(initialState, { type: "view", roomView: roomView() }).roomView).toBeNull();
  });

  test("losing the session goes back to the landing with a notice", () => {
    for (const message of ["Session expired", "Opened in another tab"]) {
      const next = reducer(reducer(joined, { type: "resuming" }), { type: "roomError", message });
      expect(next.room).toBeNull();
      expect(next.resuming).toBe(false);
      expect(next.notices.at(-1)).toMatchObject({ message, tone: "info" });
    }
  });

  test("other errors keep the room and queue error notices", () => {
    let next = reducer(joined, { type: "roomError", message: "Lobby full" });
    next = reducer(next, { type: "moveError", message: "Not your turn" });

    expect(next.room).toEqual(joined.room);
    expect(next.notices.map(n => n.message)).toEqual(["Lobby full", "Not your turn"]);
    expect(next.notices.map(n => n.id)).toEqual([1, 2]);

    next = reducer(next, { type: "dismissNotice", id: 1 });
    expect(next.notices.map(n => n.message)).toEqual(["Not your turn"]);
  });

  test("leaving clears the room, disconnecting keeps it for the resume", () => {
    expect(reducer(joined, { type: "leftRoom" }).room).toBeNull();

    const offline = reducer(joined, { type: "disconnected" });
    expect(offline.connected).toBe(false);
    expect(offline.room).toEqual(joined.room);
  });
});

describe("previousView", () => {
  test("keeps the view before the latest action, through repeated views", () => {
    const first = reducer(joined, { type: "view", roomView: roomView({ actionSeq: 4 }) });
    expect(first.previousView).toBeNull();
    const second = reducer(first, { type: "view", roomView: roomView({ actionSeq: 5 }) });
    expect(second.previousView?.actionSeq).toBe(4);
    // A repeated view (a connection change) keeps the pair
    const repeated = reducer(second, { type: "view", roomView: roomView({ actionSeq: 5 }) });
    expect(repeated.previousView?.actionSeq).toBe(4);
    expect(reducer(repeated, { type: "leftRoom" }).previousView).toBeNull();
  });
});
