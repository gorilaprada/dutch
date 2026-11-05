import { afterEach, describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./render.tsx";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("Landing", () => {
  test("creating needs a name", async () => {
    const { emitted } = renderApp();
    const button = screen.getByRole("button", { name: "DEAL ME IN" });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("MARA"), "  Ana ");
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(emitted.at(-1)).toEqual({ event: "createRoom", payload: { name: "Ana" } });
  });

  test("a ?room= link opens Join with the code filled in", async () => {
    window.history.replaceState(null, "", "/?room=k7p9");
    const { emitted } = renderApp();

    expect(screen.getByRole("tab", { name: "Join game" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText("K7P9")).toHaveValue("K7P9");

    await userEvent.type(screen.getByPlaceholderText("MARA"), "Bob");
    await userEvent.click(screen.getByRole("button", { name: "JOIN TABLE" }));
    expect(emitted.at(-1)).toEqual({ event: "joinRoom", payload: { code: "K7P9", name: "Bob" } });
  });

  test("joining needs a full 4-character code", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("tab", { name: "Join game" }));
    await userEvent.type(screen.getByPlaceholderText("MARA"), "Bob");
    await userEvent.type(screen.getByPlaceholderText("K7P9"), "k7p");

    const button = screen.getByRole("button", { name: "JOIN TABLE" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText("K7P9"), "9");
    expect(screen.getByPlaceholderText("K7P9")).toHaveValue("K7P9");
    expect(button).toBeEnabled();
  });
});
