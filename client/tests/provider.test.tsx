import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { getToken, setToken } from "../src/game/session.ts";
import { roomView } from "./fixtures.ts";
import { enterRoom, renderApp } from "./render.tsx";

describe("GameProvider", () => {
  test("connects on mount and shows the landing without a token", () => {
    const { socket, emitted } = renderApp();
    expect(socket.connected).toBe(true);
    expect(emitted).toEqual([]);
    expect(screen.getByText("Create game")).toBeInTheDocument();
    expect(screen.getByText("You'll get a link to share with the table.")).toBeInTheDocument();
  });

  test("resumes with a stored token instead of showing the landing", () => {
    setToken("token-9");
    const { emitted } = renderApp();
    expect(emitted).toEqual([{ event: "resume", payload: { token: "token-9" } }]);
    expect(screen.getByText("Reconnecting to your table…")).toBeInTheDocument();
  });

  test("roomJoined stores the token, the view shows the lobby", () => {
    const { fire } = renderApp();
    enterRoom(fire, roomView());
    expect(getToken()).toBe("token-1");
    expect(screen.getByText("K7P9")).toBeInTheDocument();
  });

  test("an expired session clears the token and goes back to the landing", () => {
    setToken("old");
    const { fire } = renderApp();
    fire("roomError", "Session expired");
    expect(getToken()).toBeNull();
    expect(screen.getByText("Create game")).toBeInTheDocument();
    expect(screen.getByText("Session expired")).toBeInTheDocument();
  });

  test("leaving emits leave, forgets the token and shows the landing", async () => {
    const { fire, emitted } = renderApp();
    enterRoom(fire, roomView());
    screen.getByText("LEAVE").click();
    expect(emitted.at(-1)).toEqual({ event: "move", payload: { type: "leave" } });
    expect(getToken()).toBeNull();
    expect(await screen.findByText("Create game")).toBeInTheDocument();
  });
});
