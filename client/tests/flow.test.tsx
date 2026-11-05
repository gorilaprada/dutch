import { afterEach, expect, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../../server/src/app.ts";
import { App } from "../src/App.tsx";
import { GameProvider } from "../src/game/GameProvider.tsx";
import type { GameSocket } from "../src/game/socket.ts";

// End to end: the real server, a real socket and the real App (Ana),
// with a plain socket playing Bob
let cleanup: (() => Promise<void>) | null = null;
afterEach(async () => {
  await cleanup?.();
  cleanup = null;
});

test("create, join, ready, deal, memorize, then draw and play a card", async () => {
  const server = createGameServer({ timings: { memorizeMs: 600 } });
  await new Promise<void>(resolve => server.httpServer.listen(0, resolve));
  const url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;

  const ana = io(url, { autoConnect: false, transports: ["websocket"] }) as GameSocket;
  const bob: Socket = io(url, { transports: ["websocket"] });
  cleanup = async () => {
    ana.disconnect();
    bob.disconnect();
    await server.close();
  };
  const { container } = render(<GameProvider socket={ana}><App /></GameProvider>);

  // Ana creates the room
  await screen.findByText("You'll get a link to share with the table.");
  await userEvent.type(screen.getByPlaceholderText("MARA"), "Ana");
  await userEvent.click(screen.getByRole("button", { name: "DEAL ME IN" }));
  await screen.findByText("Ana (you)");
  const code = container.querySelector(".room-code")?.textContent ?? "";

  // Bob joins and readies up, then Ana
  bob.emit("joinRoom", { code, name: "Bob" });
  await screen.findByText("Bob");
  bob.emit("move", { type: "ready" });
  await userEvent.click(screen.getByRole("button", { name: "I'M READY" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "DEAL THE ROUND" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "DEAL THE ROUND" }));

  // Memorizing: my cards 1 and 2 face up, 3 and 4 hidden, Bob's all hidden
  await screen.findByText("Memorize your two cards.");
  expect(screen.getByLabelText(/^You, card 1/)).not.toHaveAccessibleName(/face down/);
  expect(screen.getByLabelText(/^You, card 2/)).not.toHaveAccessibleName(/face down/);
  expect(screen.getByLabelText(/^You, card 3/)).toHaveAccessibleName(/face down/);
  expect(screen.getAllByLabelText(/^Bob, card \d \(face down\)$/)).toHaveLength(4);
  expect(screen.getByLabelText("Memorize countdown")).toBeInTheDocument();

  // The server timer ends memorizing: Ana (lowest seat) starts, cards hidden
  await screen.findByText(/^Your turn/, {}, { timeout: 3000 });
  expect(screen.getByLabelText(/^You, card 1/)).toHaveAccessibleName(/face down/);

  // Draw from the deck: the drawn card shows face up for me
  await userEvent.click(screen.getByRole("button", { name: "Deck" }));
  await screen.findByText("You drew from the deck");
  expect(container.querySelector(".felt .card-face")).not.toBeNull();

  // Switch it into card 1: either the turn passes or a Jack/Queen power starts
  await userEvent.click(screen.getByLabelText(/^You, card 1/));
  await screen.findByText(/^You switched card 1 and discarded/);
  expect(container.querySelector(".felt .card-empty")).not.toBeNull();
  expect(screen.getByText(/Waiting on Bob|Jack power|Queen power/)).toBeInTheDocument();
}, 15_000);
