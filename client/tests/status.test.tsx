import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { setToken } from "../src/game/session.ts";
import { seat, tableView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

describe("connection and spectators", () => {
  test("a disconnected player shows an OFFLINE countdown", () => {
    const { fire } = renderApp();
    const view = tableView();
    enterRoom(fire, { ...view, connected: { 0: true, 1: false }, graceDeadlines: { 1: Date.now() + 23_000 } });
    expect(screen.getByText("OFFLINE 23s")).toBeInTheDocument();
  });

  test("losing my connection shows a banner, the reconnect resumes the seat", () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView());

    fire("disconnect");
    expect(screen.getByText("Connection lost: reconnecting…")).toBeInTheDocument();

    fire("connect");
    expect(emitted.at(-1)).toEqual({ event: "resume", payload: { token: "token-1" } });
    expect(screen.queryByText("Connection lost: reconnecting…")).toBeNull();
  });

  test("the strip lists who is out and who is watching", () => {
    const { fire } = renderApp();
    enterRoom(fire, { ...tableView({ players: [seat(0, { hand: [null] }), seat(1, { hand: [null] })] }), eliminated: [2], watchers: ["Eve"] });
    expect(screen.getByText("Out: Cat · Watching: Eve")).toBeInTheDocument();
  });

  test("an eliminated player is told they are out", () => {
    setToken("token-1");
    const { fire } = renderApp();
    const view = tableView({ you: null, turnIndex: 1, players: [seat(1, { hand: [null] }), seat(3, { hand: [null] })] });
    enterRoom(fire, { ...view, eliminated: [0] }, 0);
    expect(screen.getByText("You're out: watching the rest of the game")).toBeInTheDocument();
    expect(screen.getByText("You're out. Bob is playing.")).toBeInTheDocument();
  });
});
