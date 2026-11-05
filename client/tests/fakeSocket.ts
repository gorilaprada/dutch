import { act } from "@testing-library/react";
import type { GameSocket } from "../src/game/socket.ts";

type Listener = (payload?: unknown) => void;

// Stands in for socket.io-client: records emits, lets a test fire server events
export function fakeSocket() {
  const listeners = new Map<string, Set<Listener>>();
  const emitted: { event: string; payload: unknown }[] = [];

  const fake = {
    connected: false,
    on(event: string, listener: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return fake;
    },
    off(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
      return fake;
    },
    emit(event: string, payload?: unknown) {
      emitted.push({ event, payload });
      return fake;
    },
    connect() {
      // Called from the provider's effect, already inside React's act: a nested
      // act would swallow the state updates, so call the listeners directly
      fake.connected = true;
      call("connect");
      return fake;
    },
  };

  function call(event: string, payload?: unknown): void {
    for (const listener of listeners.get(event) ?? []) listener(payload);
  }

  // Server -> client event from a test, wrapped in act so React state updates flush
  function fire(event: string, payload?: unknown): void {
    act(() => call(event, payload));
  }

  return { socket: fake as unknown as GameSocket, emitted, fire };
}
