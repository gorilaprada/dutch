import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { startServer, next, viewWhere, wait, startedGame } from "./harness.ts";

const PHASE_MS = 30;
const GRACE_MS = 150;
let harness: Awaited<ReturnType<typeof startServer>>;

beforeEach(async () => {
  harness = await startServer({
    timings: { memorizeMs: PHASE_MS, peekMs: PHASE_MS, scoringMs: PHASE_MS, reconnectMs: GRACE_MS },
  });
});

afterEach(async () => {
  await harness.close();
});

// Started game with memorizing over: seat 0 (Ana) to draw
async function drawingGame() {
  const game = await startedGame(harness.client);
  await viewWhere(game.bob, v => v.view.phase === "drawing");
  return game;
}

describe("reconnect", () => {
  test("a disconnect mid-game holds the seat and the others see a countdown", async () => {
    const { ana, bob } = await drawingGame();

    const bobSees = viewWhere(bob, v => v.connected[0] === false);
    const before = Date.now();
    ana.disconnect();
    const v = await bobSees;

    expect(v.names).toEqual({ 0: "Ana", 1: "Bob" });
    expect(v.view.players.map(p => p.seat)).toEqual([0, 1]);
    expect(v.graceDeadlines[0]).toBeGreaterThanOrEqual(before + GRACE_MS);
    expect(v.graceDeadlines[1]).toBeUndefined();
  });

  test("resuming with the token gives the seat back", async () => {
    const { ana, bob, anaToken } = await drawingGame();

    const away = viewWhere(bob, v => v.connected[0] === false);
    ana.disconnect();
    await away;

    const anaAgain = await harness.client();
    const joined = next(anaAgain, "roomJoined");
    const view = next(anaAgain, "view");
    const bobSeesBack = viewWhere(bob, v => v.connected[0] === true);
    anaAgain.emit("resume", { token: anaToken });

    expect(await joined).toMatchObject({ seat: 0, token: anaToken });
    const own = await view;
    expect(own.view.you).toBe(0);
    expect(own.view.players.find(p => p.seat === 0)!.hand).toEqual([null, null, null, null]);
    expect((await bobSeesBack).graceDeadlines).toEqual({});

    // The resumed socket can play: it is still seat 0's turn
    const drew = viewWhere(anaAgain, v => v.view.phase === "deciding");
    anaAgain.emit("move", { type: "draw", from: "drawPile" });
    expect((await drew).view.players.find(p => p.seat === 0)!.drawnCard).not.toBeNull();
  });

  test("the game waits on a disconnected player's turn until the grace ends", async () => {
    const { ana, bob, code } = await drawingGame();
    const room = harness.server.rooms.get(code)!;

    ana.disconnect();
    await wait(GRACE_MS / 2);
    expect(room.state.phase).toBe("drawing");
    expect(room.state.turnIndex).toBe(0);

    // Grace over: Ana leaves, Bob is alone so the game is finished
    const finished = await viewWhere(bob, v => v.view.phase === "finished");
    expect(finished.names).toEqual({ 1: "Bob" });
    expect(finished.view.lastAction).toEqual({ type: "leave", seat: 0 });
  });

  test("a lobby disconnect frees the seat at once", async () => {
    const ana = await harness.client();
    const bob = await harness.client();
    const anaJoined = next(ana, "roomJoined");
    ana.emit("createRoom", { name: "Ana" });
    const { code } = await anaJoined;
    const bobJoined = next(bob, "roomJoined");
    bob.emit("joinRoom", { code, name: "Bob" });
    const { token } = await bobJoined;

    const anaAlone = viewWhere(ana, v => Object.keys(v.names).length === 1);
    bob.disconnect();
    expect((await anaAlone).graceDeadlines).toEqual({});

    const bobAgain = await harness.client();
    const error = next(bobAgain, "roomError");
    bobAgain.emit("resume", { token });
    expect(await error).toBe("Session expired");
  });

  test("an unknown token is rejected", async () => {
    const stranger = await harness.client();

    let error = next(stranger, "roomError");
    stranger.emit("resume", { token: "not-a-token" });
    expect(await error).toBe("Session expired");

    error = next(stranger, "roomError");
    stranger.emit("resume", {});
    expect(await error).toBe("Session expired");
  });

  test("a second tab with the same token takes over the seat", async () => {
    const { ana, bob, anaToken } = await drawingGame();

    const kicked = next(ana, "roomError");
    const secondTab = await harness.client();
    const joined = next(secondTab, "roomJoined");
    secondTab.emit("resume", { token: anaToken });

    expect(await kicked).toBe("Opened in another tab");
    expect((await joined).seat).toBe(0);

    // The old tab is detached: its moves are refused, its disconnect is ignored
    const refused = next(ana, "moveError");
    ana.emit("move", { type: "draw", from: "drawPile" });
    expect(await refused).toBe("Join or create a room first");

    let bobSawDisconnect = false;
    bob.on("view", v => { if (v.connected[0] === false) bobSawDisconnect = true; });
    ana.disconnect();
    await wait(50);
    expect(bobSawDisconnect).toBe(false);
  });

  test("a leave move ends the session, so it cannot be resumed", async () => {
    const { ana, bob, anaToken } = await drawingGame();

    const gone = viewWhere(bob, v => v.names[0] === undefined);
    ana.emit("move", { type: "leave" });
    await gone;

    const anaAgain = await harness.client();
    const error = next(anaAgain, "roomError");
    anaAgain.emit("resume", { token: anaToken });
    expect(await error).toBe("Session expired");
  });

  test("the room is deleted only after the last grace period ends", async () => {
    const { ana, bob, code } = await drawingGame();

    ana.disconnect();
    bob.disconnect();
    await wait(GRACE_MS / 2);
    expect(harness.server.rooms.has(code)).toBe(true);

    await wait(GRACE_MS + 50);
    expect(harness.server.rooms.has(code)).toBe(false);
    expect(harness.server.ctx.tokens.size).toBe(0);
  });
});
