import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { commit } from "../src/handlers.ts";
import type { Room } from "../src/rooms.ts";
import { startServer, next, viewWhere, wait, startedGame } from "./harness.ts";

const PHASE_MS = 30;
let harness: Awaited<ReturnType<typeof startServer>>;

beforeEach(async () => {
  harness = await startServer({
    timings: { memorizeMs: PHASE_MS, peekMs: PHASE_MS, scoringMs: PHASE_MS, reconnectMs: 10_000 },
  });
});

afterEach(async () => {
  await harness.close();
});

// ========= Helpers =============
function roomOf(code: string): Room {
  const room = harness.server.rooms.get(code);
  if (!room) throw new Error(`Room ${code} not found`);
  return room;
}

async function drawingGame() {
  const game = await startedGame(harness.client);
  await viewWhere(game.ana, v => v.view.phase === "drawing");
  return game;
}

async function join(code: string, name: string) {
  const socket = await harness.client();
  const joined = next(socket, "roomJoined");
  socket.emit("joinRoom", { code, name });
  return { socket, ...(await joined) };
}

// Ends the game with only seat 0 (Ana) left: seat 1 (Bob) is eliminated
function finishWithAnaWinning(code: string): void {
  const room = roomOf(code);
  const players = new Map([...room.state.players].filter(([seat]) => seat === 0));
  room.state = { ...room.state, players, phase: "finished" };
  commit(harness.server.ctx, room);
}

describe("watchers", () => {
  test("joining a running game makes you a watcher with the spectator view", async () => {
    const { ana, code } = await drawingGame();

    const anaSeesCarl = viewWhere(ana, v => v.watchers.length === 1);
    const carl = await harness.client();
    const joined = next(carl, "roomJoined");
    const view = next(carl, "view");
    carl.emit("joinRoom", { code, name: "Carl" });

    expect((await joined).seat).toBeNull();
    const carlView = await view;
    expect(carlView.view.you).toBeNull();
    expect(carlView.view.players.every(p => p.hand.every(c => c === null))).toBe(true);
    expect((await anaSeesCarl).watchers).toEqual(["Carl"]);
    expect(carlView.names).toEqual({ 0: "Ana", 1: "Bob" });
  });

  test("joining a full lobby makes you a watcher who can sit when a seat frees up", async () => {
    const ana = await harness.client();
    const created = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    const { code } = await created;
    await join(code, "Bob");
    await join(code, "Cat");
    const dan = await join(code, "Dan");
    const eve = await join(code, "Eve");
    expect(dan.seat).toBe(3);
    expect(eve.seat).toBeNull();

    // Full: sitting fails
    let error = next(eve.socket, "roomError");
    eve.socket.emit("sit");
    expect(await error).toBe("Lobby full");

    const seatFree = viewWhere(eve.socket, v => v.names[3] === undefined);
    dan.socket.emit("move", { type: "leave" });
    await seatFree;

    const seated = next(eve.socket, "roomJoined");
    const eveSeated = viewWhere(ana, v => v.names[3] === "Eve");
    eve.socket.emit("sit");
    expect((await seated).seat).toBe(3);
    expect((await eveSeated).watchers).toEqual([]);

    error = next(eve.socket, "roomError");
    eve.socket.emit("sit");
    expect(await error).toBe("Already seated");
  });

  test("a watcher cannot play or sit during a game", async () => {
    const { code } = await drawingGame();
    const carl = await join(code, "Carl");

    const moveError = next(carl.socket, "moveError");
    carl.socket.emit("move", { type: "draw", from: "drawPile" });
    expect(await moveError).toBe("Spectators cannot play");

    const sitError = next(carl.socket, "roomError");
    carl.socket.emit("sit");
    expect(await sitError).toBe("Can only sit in the lobby");
  });

  test("a spectator's disconnect ends the session at once", async () => {
    const { ana, code } = await drawingGame();
    const carl = await join(code, "Carl");

    const carlGone = viewWhere(ana, v => v.watchers.length === 0);
    carl.socket.disconnect();
    await carlGone;

    const carlAgain = await harness.client();
    const error = next(carlAgain, "roomError");
    carlAgain.emit("resume", { token: carl.token });
    expect(await error).toBe("Session expired");
  });
});

describe("eliminated players", () => {
  test("are listed, keep getting views, and cannot play", async () => {
    const { bob, code } = await drawingGame();

    const bobOut = viewWhere(bob, v => v.eliminated.length === 1);
    finishWithAnaWinning(code);
    const v = await bobOut;

    expect(v.eliminated).toEqual([1]);
    expect(v.view.you).toBeNull();
    expect(v.names).toEqual({ 0: "Ana", 1: "Bob" });

    const error = next(bob, "moveError");
    bob.emit("move", { type: "dutch" });
    expect(await error).toBe("Spectators cannot play");
  });
});

describe("rematch", () => {
  test("is refused before the game is finished", async () => {
    const { ana } = await drawingGame();
    const error = next(ana, "roomError");
    ana.emit("rematch");
    expect(await error).toBe("Game is not finished");
  });

  test("reseats the winner, the eliminated and watchers in a fresh lobby", async () => {
    const { ana, bob, code } = await drawingGame();
    const carl = await join(code, "Carl");
    finishWithAnaWinning(code);

    const carlSeat = next(carl.socket, "roomJoined");
    const bobSeat = next(bob, "roomJoined");
    const lobby = viewWhere(ana, v => v.view.phase === "lobby");
    carl.socket.emit("rematch");

    expect((await carlSeat).seat).toBe(2);
    expect((await bobSeat).seat).toBe(1);
    const v = await lobby;
    expect(v.names).toEqual({ 0: "Ana", 1: "Bob", 2: "Carl" });
    expect(v.watchers).toEqual([]);
    expect(v.eliminated).toEqual([]);
    expect(v.view.players.every(p => !p.isReady && p.score === 50)).toBe(true);
  });

  test("more than 4 people: the extras keep watching", async () => {
    const { ana, code } = await drawingGame();
    await join(code, "Carl");
    await join(code, "Dan");
    const eve = await join(code, "Eve");
    finishWithAnaWinning(code);

    const eveStill = next(eve.socket, "roomJoined");
    const lobby = viewWhere(ana, v => v.view.phase === "lobby");
    ana.emit("rematch");

    expect((await eveStill).seat).toBeNull();
    const v = await lobby;
    expect(v.names).toEqual({ 0: "Ana", 1: "Bob", 2: "Carl", 3: "Dan" });
    expect(v.watchers).toEqual(["Eve"]);
  });

  test("players who are disconnected lose their spot", async () => {
    const { ana, bob, code } = await drawingGame();
    finishWithAnaWinning(code);

    // Ana (the winner) is still in the game, so her seat is held in grace
    const anaAway = viewWhere(bob, v => v.connected[0] === false);
    ana.disconnect();
    await anaAway;

    const bobSeat = next(bob, "roomJoined");
    const lobby = viewWhere(bob, v => v.view.phase === "lobby");
    bob.emit("rematch");

    expect((await bobSeat).seat).toBe(0);
    expect((await lobby).names).toEqual({ 0: "Bob" });
    expect(roomOf(code).sessions.size).toBe(1);
  });

  test("the new game can be readied, started and played", async () => {
    const { ana, bob, code } = await drawingGame();
    finishWithAnaWinning(code);

    const lobby = viewWhere(ana, v => v.view.phase === "lobby");
    ana.emit("rematch");
    await lobby;

    const memorizing = viewWhere(bob, v => v.view.phase === "memorizing");
    const bothReady = viewWhere(ana, v => v.view.players.every(p => p.isReady));
    ana.emit("move", { type: "ready" });
    bob.emit("move", { type: "ready" });
    await bothReady;
    ana.emit("move", { type: "start" });

    const started = await memorizing;
    expect(started.view.players.find(p => p.seat === 1)!.hand.map(c => c !== null))
      .toEqual([true, true, false, false]);
    await wait(PHASE_MS * 2);
    expect(roomOf(code).state.phase).toBe("drawing");
  });
});

