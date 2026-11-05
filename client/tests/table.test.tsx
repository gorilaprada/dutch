import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { card, seat, tableView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

const ownCard = (n: number) => screen.getByLabelText(new RegExp(`^You, card ${n}`));
const bobCard = (n: number) => screen.getByLabelText(new RegExp(`^Bob, card ${n}`));

describe("Table", () => {
  test("memorizing shows my cards 1 and 2 and a countdown", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({
      phase: "memorizing",
      deadline: Date.now() + 5000,
      players: [
        seat(0, { hand: [card("♡", 3), card("♤", 9), null, null] }),
        seat(1, { hand: [null, null, null, null] }),
      ],
    }));

    expect(ownCard(1)).toHaveAccessibleName("You, card 1");
    expect(ownCard(3)).toHaveAccessibleName("You, card 3 (face down)");
    expect(screen.getByLabelText("Memorize countdown")).toHaveTextContent("5");
    expect(screen.getByText("Memorize your two cards.")).toBeInTheDocument();
  });

  test("drawing: the deck and the discard pile draw, Dutch can be called", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView());

    await userEvent.click(screen.getByRole("button", { name: "Deck" }));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "draw", from: "drawPile" } });
    await userEvent.click(screen.getByRole("button", { name: "5♡" }));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "draw", from: "discardPile" } });

    const dutch = screen.getByRole("button", { name: "CALL DUTCH" });
    expect(dutch).toBeEnabled();
    await userEvent.click(dutch);
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "dutch" } });
  });

  test("not my turn: no drawing, no Dutch, but a click stacks", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({ turnIndex: 1 }));

    expect(screen.queryByRole("button", { name: "Deck" })).toBeNull();
    expect(screen.getByRole("button", { name: "CALL DUTCH" })).toBeDisabled();
    expect(screen.getByText(/Waiting on Bob/)).toBeInTheDocument();

    await userEvent.click(ownCard(3));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "stack", handIndex: 2 } });
  });

  test("deciding: my drawn card shows, a click switches, DISCARD discards", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({
      phase: "deciding",
      players: [
        seat(0, { hand: [null, null, null, null], hasDrawnCard: true, drawnCard: card("♧", 8) }),
        seat(1, { hand: [null, null, null, null] }),
      ],
    }));

    expect(screen.getByRole("img", { name: "8♧" })).toBeInTheDocument();
    await userEvent.click(ownCard(2));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "switch", handIndex: 1 } });

    await userEvent.click(screen.getByRole("button", { name: "DISCARD" }));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "discard" } });
  });

  test("deciding with the STACK toggle stacks instead of switching", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({ phase: "deciding" }));

    await userEvent.click(screen.getByRole("button", { name: "STACK" }));
    expect(screen.getByRole("button", { name: "CANCEL STACK" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(ownCard(4));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "stack", handIndex: 3 } });
    expect(screen.getByRole("button", { name: "STACK" })).toBeInTheDocument();
  });

  test("taking from the discard pile hides DISCARD (takers keepers)", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({ phase: "deciding", view: { fromDiscard: true } }));
    expect(screen.queryByRole("button", { name: "DISCARD" })).toBeNull();
  });

  test("someone else holding a card shows a face-down drawn card", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({
      phase: "deciding",
      turnIndex: 1,
      players: [seat(0, { hand: [null] }), seat(1, { hand: [null], hasDrawnCard: true })],
    }));
    expect(screen.getByRole("img", { name: "Drawn card (face down)" })).toBeInTheDocument();
  });

  test("Jack: two clicks on two different players' cards", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({ phase: "power_jack" }));

    await userEvent.click(ownCard(1));
    expect(screen.getByText("Jack power: now pick a card from another player.")).toBeInTheDocument();
    expect(emitted).toHaveLength(0);
    await userEvent.click(bobCard(4));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "jack", seat1: 0, i1: 0, seat2: 1, i2: 3 } });
  });

  test("Queen: pick a card, then the peeker sees it face up in its slot", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView({ phase: "power_queen" }));

    await userEvent.click(bobCard(2));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "queen", targetSeat: 1, handIndex: 1 } });

    fire("view", tableView({
      phase: "peeking",
      view: { peek: { peeker: 0, targetSeat: 1, handIndex: 1, card: card("♢", 12) }, actionSeq: 9 },
    }));
    expect(bobCard(2)).toHaveAccessibleName("Bob, card 2");
    expect(screen.getByText("Peeking at Bob's card 2…")).toBeInTheDocument();
  });

  test("the last-move line and the Dutch banner", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({
      turnIndex: 1,
      view: { dutch: { seat: 1 }, lastAction: { type: "dutch", seat: 1 } },
    }));
    expect(screen.getByText("Bob called DUTCH")).toBeInTheDocument();
    expect(screen.getByText("Dutch called by Bob: one last turn each")).toBeInTheDocument();
  });

  test("a spectator sees the table without controls", () => {
    const { fire } = renderApp();
    enterRoom(fire, tableView({ you: null }), null);
    expect(screen.getByText("Watching")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CALL DUTCH" })).toBeNull();
  });
});
