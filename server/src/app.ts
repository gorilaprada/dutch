import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerHandlers, type DutchServer, type ServerContext } from "./handlers.ts";
import { DEFAULT_TIMINGS, clearTimer, type Timings } from "./timers.ts";

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
    timings: { ...DEFAULT_TIMINGS, ...options.timings },
  };

  io.on("connection", socket => registerHandlers(ctx, socket));

  // Stops every room timer before closing, so nothing fires after shutdown
  async function close(): Promise<void> {
    for (const room of ctx.rooms.values()) clearTimer(room);
    await io.close();
  }

  return { app, httpServer, io, rooms: ctx.rooms, ctx, close };
}
