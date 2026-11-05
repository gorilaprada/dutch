import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { startServer, next, viewWhere, wait, startedGame as startGameWith } from "./harness.ts";

let harness: Awaited<ReturnType<typeof startServer>>;
let server: typeof harness.server;
let client: typeof harness.client;

beforeEach(async () => {
  harness = await startServer();
  ({ server, client } = harness);
});

afterEach(async () => {
  await harness.close();
});

const startedGame = () => startGameWith(client);

describe("rooms", () => {
  test("createRoom returns a code and seat 0, and a lobby view with the name", async () => {
    const ana = await client();
    const joined = next(ana, "roomJoined");
    const view = next(ana, "view");
    ana.emit("createRoom", { name: "  Ana  " });

    const { code, seat } = await joined;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(seat).toBe(0);

    const first = await view;
    expect(first.names).toEqual({ 0: "Ana" });
    expect(first.view.phase).toBe("lobby");
  });

  test("joinRoom accepts a lowercase code and both players see both names", async () => {
    const ana = await client();
    const bob = await client();
    const anaJoined = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    const { code } = await anaJoined;

    const anaSeesBob = viewWhere(ana, v => Object.keys(v.names).length === 2);
    const bobJoined = next(bob, "roomJoined");
    bob.emit("joinRoom", { code: code.toLowerCase(), name: "Bob" });

    expect((await bobJoined).seat).toBe(1);
    expect((await anaSeesBob).names).toEqual({ 0: "Ana", 1: "Bob" });
  });

  test("unknown room and invalid names are rejected", async () => {
    const ana = await client();

    let error = next(ana, "roomError");
    ana.emit("joinRoom", { code: "ZZZZ", name: "Ana" });
    expect(await error).toBe("Room not found");

    error = next(ana, "roomError");
    ana.emit("createRoom", { name: "   " });
    expect(await error).toBe("Invalid name");

    error = next(ana, "roomError");
    ana.emit("createRoom", { name: 42 });
    expect(await error).toBe("Invalid name");
  });

  test("a socket cannot be in two rooms", async () => {
    const ana = await client();
    const joined = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    await joined;

    const error = next(ana, "roomError");
    ana.emit("createRoom", { name: "Ana" });
    expect(await error).toBe("Already in a room");
  });
});

describe("moves", () => {
  test("a move before joining is rejected", async () => {
    const ana = await client();
    const error = next(ana, "moveError");
    ana.emit("move", { type: "ready" });
    expect(await error).toBe("Join or create a room first");
  });

  test("starting the game sends each player their own memorizing view", async () => {
    const { anaView, bobView } = await startedGame();

    const anaOwn = anaView.view.players.find(p => p.seat === 0)!;
    const anaOther = anaView.view.players.find(p => p.seat === 1)!;
    expect(anaOwn.hand.map(c => c !== null)).toEqual([true, true, false, false]);
    expect(anaOther.hand).toEqual([null, null, null, null]);

    const bobOwn = bobView.view.players.find(p => p.seat === 1)!;
    expect(bobOwn.hand.map(c => c !== null)).toEqual([true, true, false, false]);
    expect(bobView.view.you).toBe(1);
    expect(anaView.view.topDiscard).not.toBeNull();
  });

  test("a rejected move only answers the sender", async () => {
    const { ana, bob } = await startedGame();

    let anaGotView = false;
    ana.on("view", () => { anaGotView = true; });

    const error = next(bob, "moveError");
    bob.emit("move", { type: "draw", from: "drawPile" });
    expect(await error).toBe("Not your turn");
    await wait(50);
    expect(anaGotView).toBe(false);
  });

  test("clients cannot send server-only or join moves", async () => {
    const { ana } = await startedGame();

    let error = next(ana, "moveError");
    ana.emit("move", { type: "endMemorizing" });
    expect(await error).toBe("Invalid move");

    error = next(ana, "moveError");
    ana.emit("move", { type: "addPlayer" });
    expect(await error).toBe("Use joinRoom to join");

    error = next(ana, "moveError");
    ana.emit("move", { type: "stack", handIndex: "0" });
    expect(await error).toBe("Invalid move");
  });

  test("the seat comes from the session, not the payload", async () => {
    const { bob } = await startedGame();

    // Bob tries to act as seat 0, whose turn it would be
    const error = next(bob, "moveError");
    bob.emit("move", { type: "dutch", seat: 0 });
    expect(await error).toBe("Not your turn");
  });
});

describe("leaving", () => {
  test("a disconnect removes the player and the others get a new view", async () => {
    const ana = await client();
    const bob = await client();
    const anaJoined = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    const { code } = await anaJoined;
    const bobJoined = next(bob, "roomJoined");
    bob.emit("joinRoom", { code, name: "Bob" });
    await bobJoined;

    const anaAlone = viewWhere(ana, v => Object.keys(v.names).length === 1);
    bob.disconnect();
    const v = await anaAlone;

    expect(v.names).toEqual({ 0: "Ana" });
    expect(v.view.players.map(p => p.seat)).toEqual([0]);
    expect(v.view.lastAction).toEqual({ type: "leave", seat: 1 });
  });

  test("the room is deleted when the last player leaves", async () => {
    const ana = await client();
    const joined = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    const { code } = await joined;
    expect(server.rooms.has(code)).toBe(true);

    ana.disconnect();
    await wait(50);
    expect(server.rooms.has(code)).toBe(false);
  });
});
