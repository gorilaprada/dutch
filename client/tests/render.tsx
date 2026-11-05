import { render } from "@testing-library/react";
import { App } from "../src/App.tsx";
import { GameProvider } from "../src/game/GameProvider.tsx";
import type { RoomView } from "../src/game/protocol.ts";
import { fakeSocket } from "./fakeSocket.ts";

// The whole app on a fake socket, already connected
export function renderApp() {
  const fake = fakeSocket();
  const utils = render(
    <GameProvider socket={fake.socket}>
      <App />
    </GameProvider>,
  );
  return { ...fake, ...utils };
}

// Puts the app in a room with this view, as the server would
export function enterRoom(fire: (event: string, payload?: unknown) => void, view: RoomView, seat: number | null = view.view.you) {
  fire("roomJoined", { code: view.code, seat, token: "token-1" });
  fire("view", view);
}
