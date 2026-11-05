import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { roomView, seat } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

describe("Lobby", () => {
  test("shows the seats, the names and empty seats", () => {
    const { fire } = renderApp();
    enterRoom(fire, roomView());

    expect(screen.getByText("Ana (you)")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("EMPTY SEAT")).toHaveLength(2);
  });

  test("ready is one way", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, roomView());

    await userEvent.click(screen.getByRole("button", { name: "I'M READY" }));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "ready" } });

    fire("view", roomView({ players: [seat(0, { isReady: true }), seat(1)], actionSeq: 2 }));
    expect(screen.getByRole("button", { name: "READY ✓" })).toBeDisabled();
  });

  test("dealing needs 2 players who are all ready", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, roomView({ players: [seat(0, { isReady: true })] }));
    const deal = () => screen.getByRole("button", { name: "DEAL THE ROUND" });
    expect(deal()).toBeDisabled();

    fire("view", roomView({ players: [seat(0, { isReady: true }), seat(1)], actionSeq: 2 }));
    expect(deal()).toBeDisabled();

    fire("view", roomView({ players: [seat(0, { isReady: true }), seat(1, { isReady: true })], actionSeq: 3 }));
    expect(deal()).toBeEnabled();
    await userEvent.click(deal());
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "start" } });
  });

  test("a watcher can take a free seat, and only when one is free", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, roomView({ you: null, watchers: ["Eve"] }), null);

    expect(screen.queryByRole("button", { name: "I'M READY" })).toBeNull();
    expect(screen.queryByRole("button", { name: "DEAL THE ROUND" })).toBeNull();
    expect(screen.getByText("Eve")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "TAKE A SEAT" }));
    expect(emitted.at(-1)).toEqual({ event: "sit", payload: undefined });

    fire("view", roomView({ you: null, players: [seat(0), seat(1), seat(2), seat(3)], actionSeq: 2 }));
    expect(screen.getByRole("button", { name: "TAKE A SEAT" })).toBeDisabled();
  });

  test("a started game leaves the lobby", () => {
    const { fire } = renderApp();
    enterRoom(fire, roomView());
    fire("view", roomView({ phase: "memorizing", actionSeq: 5 }));
    expect(screen.getByText("Memorize your two cards.")).toBeInTheDocument();
  });
});
