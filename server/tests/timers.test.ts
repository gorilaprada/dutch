import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { commit } from "../src/handlers.ts";
import type { Room } from "../src/rooms.ts";
import { startServer, viewWhere, wait, startedGame } from "./harness.ts";

const MS = 40;
let harness: Awaited<ReturnType<typeof startServer>>;

beforeEach(async () => {
  harness = await startServer({ timings: { memorizeMs: MS, peekMs: MS, scoringMs: MS } });
});

afterEach(async () => {
  await harness.close();
});

function roomOf(code: string): Room {
  const room = harness.server.rooms.get(code);
  if (!room) throw new Error(`Room ${code} not found`);
  return room;
}

// Started game with memorizing already over: seat 0 (Ana) to draw
async function drawingGame() {
  const game = await startedGame(harness.client);
  await viewWhere(game.ana, v => v.view.phase === "drawing");
  return game;
}

describe("timers", () => {
  test("memorizing ends by itself and the deadline is sent", async () => {
    const before = Date.now();
    const { ana, anaView } = await startedGame(harness.client);

    expect(anaView.deadline).toBeGreaterThanOrEqual(before + MS);
    const drawing = await viewWhere(ana, v => v.view.phase === "drawing");
    expect(drawing.view.lastAction).toEqual({ type: "endMemorizing" });
    expect(drawing.deadline).toBeNull();
  });

  test("a queen peek ends by itself and the turn passes", async () => {
    const { ana, bob, code } = await drawingGame();
    const room = roomOf(code);
    room.state = { ...room.state, phase: "power_queen" };

    const peeking = viewWhere(ana, v => v.view.phase === "peeking");
    const bobTurn = viewWhere(bob, v => v.view.phase === "drawing" && v.view.turnIndex === 1);
    ana.emit("move", { type: "queen", targetSeat: 1, handIndex: 0 });

    const peek = await peeking;
    expect(peek.view.peek?.card).not.toBeNull();
    expect(peek.deadline).not.toBeNull();
    expect((await bobTurn).view.lastAction).toEqual({ type: "endPeek", seat: 0 });
  });

  test("scoring reveals every hand, then the next round is dealt", async () => {
    const { ana, code } = await drawingGame();
    const room = roomOf(code);

    const scoring = viewWhere(ana, v => v.view.phase === "scoring");
    const nextRound = viewWhere(ana, v => v.view.phase === "memorizing");
    room.state = { ...room.state, phase: "scoring" };
    commit(harness.server.ctx, room);

    const reveal = await scoring;
    expect(reveal.view.players.every(p => p.hand.every(c => c !== null))).toBe(true);
    expect(reveal.deadline).not.toBeNull();

    const round = await nextRound;
    expect(round.view.lastAction).toEqual({ type: "countPoints" });
    expect(round.view.players.every(p => p.hand.length === 4)).toBe(true);
  });

  test("the same phase keeps the running timer", async () => {
    const { code } = await startedGame(harness.client);
    const room = roomOf(code);
    const timer = room.timer;

    commit(harness.server.ctx, room);
    expect(room.timer).toBe(timer);
  });

  test("the peeker leaving mid-peek cancels the peek timer", async () => {
    const { ana, bob, code } = await drawingGame();
    const room = roomOf(code);
    room.state = { ...room.state, phase: "power_queen" };

    const peeking = viewWhere(bob, v => v.view.phase === "peeking");
    ana.emit("move", { type: "queen", targetSeat: 1, handIndex: 0 });
    await peeking;

    const finished = viewWhere(bob, v => v.view.phase === "finished");
    ana.emit("move", { type: "leave" });
    await finished;

    expect(room.timer).toBeNull();
    await wait(MS * 2);
    expect(room.state.phase).toBe("finished");
  });

  test("a deleted room never starts a timer again", async () => {
    const { ana, bob, code } = await startedGame(harness.client);
    const room = roomOf(code);
    expect(room.timer).not.toBeNull();

    ana.emit("move", { type: "leave" });
    bob.emit("move", { type: "leave" });
    await wait(MS / 2);
    expect(harness.server.rooms.has(code)).toBe(false);
    expect(room.timer).toBeNull();

    // A late commit on the deleted room (e.g. from a timer) must not re-arm it
    room.state = { ...room.state, phase: "scoring" };
    commit(harness.server.ctx, room);
    expect(room.timer).toBeNull();
  });
});
