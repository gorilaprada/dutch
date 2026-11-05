import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { startServer, next } from "./harness.ts";

let clientDir: string;
let harness: Awaited<ReturnType<typeof startServer>>;
let url: string;

beforeAll(async () => {
  // A fake built client: index.html plus one asset
  clientDir = mkdtempSync(join(tmpdir(), "dutch-client-"));
  writeFileSync(join(clientDir, "index.html"), "<!doctype html><title>Dutch</title>");
  writeFileSync(join(clientDir, "app.js"), "console.log('dutch')");

  harness = await startServer({ clientDir });
  url = `http://localhost:${(harness.server.httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await harness.close();
  rmSync(clientDir, { recursive: true, force: true });
});

describe("static client", () => {
  test("serves index.html at the root", async () => {
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>Dutch</title>");
  });

  test("serves built assets", async () => {
    const res = await fetch(`${url}/app.js`);
    expect(await res.text()).toBe("console.log('dutch')");
  });

  test("falls back to index.html for client-side routes", async () => {
    const res = await fetch(`${url}/room/K7P9`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>Dutch</title>");
  });

  test("/health still answers JSON", async () => {
    const res = await fetch(`${url}/health`);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("Socket.IO still works next to the fallback", async () => {
    const socket = await harness.client();
    const joined = next(socket, "roomJoined");
    socket.emit("createRoom", { name: "Ana" });
    expect((await joined).seat).toBe(0);
  });
});
