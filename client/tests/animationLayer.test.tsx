import { describe, expect, test } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import type { Action, RoomView } from "../src/game/protocol.ts";
import { card, tableView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

const start = tableView({ turnIndex: 1 });

function after(action: Action, seqStep = 1, view: Partial<RoomView["view"]> = {}): RoomView {
  return { ...start, view: { ...start.view, ...view, lastAction: action, actionSeq: start.view.actionSeq + seqStep } };
}

const drawnCard = () => document.querySelector<HTMLElement>('[data-slot="drawn"] .card');

describe("AnimationLayer", () => {
  test("a draw flies one hidden ghost card and hides the drawn slot until it lands", async () => {
    const { fire } = renderApp();
    enterRoom(fire, start);
    expect(screen.queryByTestId("flight-layer")).toBeNull();

    const players = start.view.players.map(p => (p.seat === 1 ? { ...p, hasDrawnCard: true } : p));
    fire("view", after({ type: "draw", seat: 1, from: "drawPile" }, 1, { phase: "deciding", players }));

    const layer = screen.getByTestId("flight-layer");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.querySelectorAll(".flight")).toHaveLength(1);
    expect(layer.querySelector(".card-facedown")).not.toBeNull();
    expect(drawnCard()?.style.opacity).toBe("0");
    // The real card stays readable for screen readers and tests
    expect(screen.getByLabelText("Drawn card (face down)")).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByTestId("flight-layer")).toBeNull());
    expect(drawnCard()?.style.opacity).toBe("");
  });

  test("a card from the discard pile flies face up", () => {
    const { fire } = renderApp();
    enterRoom(fire, start);
    fire("view", after({ type: "draw", seat: 1, from: "discardPile", card: card("♧", 7) }));
    expect(screen.getByTestId("flight-layer").querySelector(".card-face")).toHaveTextContent("7♧");
  });

  test("a skipped view and a repeated view animate nothing", () => {
    const { fire } = renderApp();
    enterRoom(fire, start);
    fire("view", after({ type: "discard", seat: 1, discarded: card("♡", 5) }, 2));
    expect(screen.queryByTestId("flight-layer")).toBeNull();
    fire("view", after({ type: "discard", seat: 1, discarded: card("♡", 5) }, 2));
    expect(screen.queryByTestId("flight-layer")).toBeNull();
  });

  test("a wrong stack shakes the card, then the penalty flies in", () => {
    const { fire } = renderApp();
    enterRoom(fire, start);
    const players = start.view.players.map(p => (p.seat === 1 ? { ...p, hand: [null, null, null, null, null] } : p));
    fire("view", after({ type: "stack", seat: 1, handIndex: 0, card: card("♧", 2), success: false }, 1, { players }));

    expect(document.querySelector('[data-slot="hand-1-0"] .card')).toHaveClass("card-shake");
    expect(screen.getByTestId("flight-layer").querySelector(".flight-penalty")).not.toBeNull();
    expect(document.querySelector<HTMLElement>('[data-slot="hand-1-4"] .card')?.style.opacity).toBe("0");
  });

  test("a new action mid-flight snaps the old one to the end", () => {
    const { fire } = renderApp();
    enterRoom(fire, start);
    fire("view", after({ type: "draw", seat: 1, from: "drawPile" }, 1, { phase: "deciding" }));
    fire("view", after({ type: "discard", seat: 1, discarded: card("♢", 4) }, 2));

    const flights = screen.getByTestId("flight-layer").querySelectorAll(".flight");
    expect(flights).toHaveLength(1);
    expect(flights[0]).toHaveTextContent("4♢");
    expect(drawnCard()?.style.opacity).toBe("");
  });
});
