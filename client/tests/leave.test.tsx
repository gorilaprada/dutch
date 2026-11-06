import { describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { tableView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

describe("leaving mid-game", () => {
  test("LEAVE asks first: STAY keeps playing, LEAVE leaves", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, tableView());

    await userEvent.click(screen.getByRole("button", { name: "LEAVE" }));
    const dialog = screen.getByRole("dialog", { name: "Leave the game" });
    await userEvent.click(within(dialog).getByRole("button", { name: "STAY" }));
    expect(screen.queryByRole("dialog", { name: "Leave the game" })).toBeNull();
    expect(emitted).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "LEAVE" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Leave the game" })).getByRole("button", { name: "LEAVE" }));
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "leave" } });
    expect(await screen.findByText("Create game")).toBeInTheDocument();
  });
});
