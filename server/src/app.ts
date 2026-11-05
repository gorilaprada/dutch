import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerHandlers, clearAllTimers, type DutchServer, type ServerContext } from "./handlers.ts";
import { DEFAULT_TIMINGS, type Timings } from "./timers.ts";

export type GameServerOptions = {
  timings?: Partial<Timings>; // tests use short timers
};

export function createGameServer(options: GameServerOptions = {}) {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const httpServer = createServer(app);
  const io: DutchServer = new Server(httpServer);
  const ctx: ServerContext = {
    io,
    rooms: new Map(),
    tokens: new Map(),
    timings: { ...DEFAULT_TIMINGS, ...options.timings },
  };

  io.on("connection", socket => registerHandlers(ctx, socket));

  // Stops every phase and grace timer before closing, so nothing fires after shutdown
  async function close(): Promise<void> {
    clearAllTimers(ctx);
    await io.close();
  }

  return { app, httpServer, io, rooms: ctx.rooms, ctx, close };
}
