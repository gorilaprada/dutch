import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { commit } from "../src/handlers.ts";
import type { Room } from "../src/rooms.ts";
import { next, startServer, startedGame, viewWhere, wait } from "./harness.ts";

const PHASE_MS = 40;
// Long enough that only the ready clicks (or a leave) can end the break in a test
const BREAK_MS = 10_000;
let harness: Awaited<ReturnType<typeof startServer>>;

beforeEach(async () => {
  harness = await startServer({
    timings: { memorizeMs: PHASE_MS, peekMs: PHASE_MS, scoringMs: PHASE_MS, roundBreakMs: BREAK_MS },
  });
});

afterEach(async () => {
  await harness.close();
});

function roomOf(code: string): Room {
  const room = harness.server.rooms.get(code);
  if (!room) throw new Error(`Room ${code} not found`);
  return room;
}

// Ana and Bob with the round scored: the summary is up, the next round held back
async function inRoundBreak() {
  const game = await startedGame(harness.client);
  await viewWhere(game.ana, v => v.view.phase === "drawing");
  const room = roomOf(game.code);
  const pause = viewWhere(game.ana, v => v.roundBreak !== null);
  room.state = { ...room.state, phase: "scoring" };
  commit(harness.server.ctx, room);
  return { ...game, room, pause: await pause };
}

describe("round break", () => {
  test("lasts the break time, not the old instant deal", async () => {
    const { pause } = await inRoundBreak();
    expect(pause.deadline! - Date.now()).toBeGreaterThan(BREAK_MS - 1000);
  });

  test("everyone ready deals the next round at once", async () => {
    const { ana, bob } = await inRoundBreak();

    const anaReady = viewWhere(bob, v => v.roundBreak?.ready.includes(0) === true);
    ana.emit("nextRoundReady");
    expect((await anaReady).view.phase).toBe("scoring");

    const nextRound = viewWhere(ana, v => v.view.phase === "memorizing");
    bob.emit("nextRoundReady");
    const round = await nextRound;
    expect(round.roundBreak).toBeNull();
    expect(round.deadline).not.toBeNull(); // the memorizing timer runs
  });

  test("a disconnected player does not block the others", async () => {
    const { ana, bob } = await inRoundBreak();
    const bobAway = viewWhere(ana, v => v.connected[1] === false);
    bob.disconnect();
    await bobAway;

    const nextRound = viewWhere(ana, v => v.view.phase === "memorizing");
    ana.emit("nextRoundReady");
    await nextRound;
  });

  test("moves wait for the next round, and ready is refused outside a break", async () => {
    const { ana, bob } = await inRoundBreak();
    const moveError = next(ana, "moveError");
    ana.emit("move", { type: "draw", from: "drawPile" });
    expect(await moveError).toBe("The next round is about to start");

    const nextRound = viewWhere(ana, v => v.view.phase === "memorizing");
    ana.emit("nextRoundReady");
    bob.emit("nextRoundReady");
    await nextRound;

    const roomError = next(ana, "roomError");
    ana.emit("nextRoundReady");
    expect(await roomError).toBe("No round to get ready for");
  });

  test("a leave that leaves one player ends the game at once", async () => {
    const { ana, bob, room } = await inRoundBreak();
    const finished = viewWhere(ana, v => v.view.phase === "finished");
    bob.emit("move", { type: "leave" });

    const over = await finished;
    expect(over.roundBreak).toBeNull();
    expect(over.view.players.map(p => p.seat)).toEqual([0]);
    await wait(PHASE_MS);
    expect(room.timer).toBeNull();
  });
});
