import { describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { card, seat, tableView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

const summary = [
  { seat: 0, pointsLost: 4, score: 46, eliminated: false },
  { seat: 1, pointsLost: 50, score: 0, eliminated: true },
];

describe("round end", () => {
  test("the scoring reveal shows each hand's total", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({
      phase: "scoring",
      players: [
        seat(0, { hand: [card("♡", 3), card("♤", 13), card("♧", 1)] }),
        seat(1, { hand: [card("♢", 13), card("♡", 12)] }),
      ],
    }));
    expect(screen.getByText("−4")).toBeInTheDocument();
    expect(screen.getByText("−25")).toBeInTheDocument();
    expect(screen.getByText("Round over: revealing hands…")).toBeInTheDocument();
  });

  test("a scored round opens the summary once", async () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView());
    fire("view", tableView({ phase: "memorizing", view: { lastAction: { type: "countPoints", summary }, actionSeq: 7 } }));

    const panel = screen.getByRole("status", { name: "Round summary" });
    expect(within(panel).getByText("−50")).toBeInTheDocument();
    expect(within(panel).getByText("Bob is out!")).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole("button", { name: "DISMISS" }));
    expect(screen.queryByRole("status", { name: "Round summary" })).toBeNull();

    // The same result arrives again (e.g. someone reconnected): stays closed
    fire("view", tableView({ phase: "memorizing", view: { lastAction: { type: "countPoints", summary }, actionSeq: 7 } }));
    expect(screen.queryByRole("status", { name: "Round summary" })).toBeNull();
  });

  test("the summary survives the next round's actions", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({ phase: "memorizing", view: { lastAction: { type: "countPoints", summary }, actionSeq: 7 } }));
    fire("view", tableView({ view: { lastAction: { type: "endMemorizing" }, actionSeq: 8 } }));
    expect(screen.getByRole("status", { name: "Round summary" })).toBeInTheDocument();
  });

  test("finished shows the winner, the scores and a rematch", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({
      phase: "finished",
      players: [seat(0)],
      view: { lastAction: { type: "countPoints", summary }, actionSeq: 9 },
    }));

    const dialog = screen.getByRole("dialog", { name: "Game over" });
    expect(within(dialog).getByText("You win")).toBeInTheDocument();
    expect(within(dialog).getByText("46")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Round summary" })).toBeNull();

    await userEvent.click(within(dialog).getByRole("button", { name: "REMATCH" }));
    expect(emitted.at(-1)).toEqual({ event: "rematch", payload: undefined });

    // The server answers with a fresh lobby
    fire("roomJoined", { code: "K7P9", seat: 0, token: "token-1" });
    fire("view", tableView({ phase: "lobby", view: { actionSeq: 10 } }));
    expect(screen.getByText("Waiting room")).toBeInTheDocument();
  });

  test("another player winning, and a win because everyone else left", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({ phase: "finished", players: [seat(1)], view: { lastAction: { type: "leave", seat: 0 } } }));
    const dialog = screen.getByRole("dialog", { name: "Game over" });
    expect(within(dialog).getByText("Bob wins")).toBeInTheDocument();
    expect(within(dialog).getByText("Everyone else left.")).toBeInTheDocument();
  });
});
