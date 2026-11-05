import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { createGameServer, type GameServerOptions } from "../src/app.ts";
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from "../src/events.ts";

export type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

// A server on a random port plus a factory for connected clients
export async function startServer(options: GameServerOptions = {}) {
  const server = createGameServer(options);
  await new Promise<void>(resolve => server.httpServer.listen(0, resolve));
  const url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;
  const clients: Client[] = [];

  async function client(): Promise<Client> {
    const socket: Client = connect(url, { transports: ["websocket"], forceNew: true });
    clients.push(socket);
    await new Promise<void>(resolve => socket.once("connect", () => resolve()));
    return socket;
  }

  async function close(): Promise<void> {
    for (const socket of clients.splice(0)) socket.disconnect();
    await server.close();
  }

  return { server, client, close };
}

// Attach the listener BEFORE emitting, Socket.IO does not buffer events
export function next<E extends keyof ServerToClientEvents>(socket: Client, event: E) {
  return new Promise<Parameters<ServerToClientEvents[E]>[0]>(resolve => {
    socket.once(event, ((payload: Parameters<ServerToClientEvents[E]>[0]) => resolve(payload)) as never);
  });
}

export function viewWhere(socket: Client, check: (v: RoomView) => boolean): Promise<RoomView> {
  return new Promise(resolve => {
    const listener = (v: RoomView) => {
      if (!check(v)) return;
      socket.off("view", listener);
      resolve(v);
    };
    socket.on("view", listener);
  });
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Two players in one room, both ready, game started (phase memorizing)
export async function startedGame(client: () => Promise<Client>) {
  const ana = await client();
  const bob = await client();

  const anaJoined = next(ana, "roomJoined");
  ana.emit("createRoom", { name: "Ana" });
  const { code } = await anaJoined;

  const bobJoined = next(bob, "roomJoined");
  bob.emit("joinRoom", { code, name: "Bob" });
  await bobJoined;

  const anaMemorizing = viewWhere(ana, v => v.view.phase === "memorizing");
  const bobMemorizing = viewWhere(bob, v => v.view.phase === "memorizing");
  const bothReady = viewWhere(ana, v => v.view.players.every(p => p.isReady));
  ana.emit("move", { type: "ready" });
  bob.emit("move", { type: "ready" });
  await bothReady;
  ana.emit("move", { type: "start" });

  return { ana, bob, code, anaView: await anaMemorizing, bobView: await bobMemorizing };
}
