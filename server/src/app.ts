import express from "express";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { registerHandlers, clearAllTimers, type DutchServer, type ServerContext } from "./handlers.ts";
import { DEFAULT_TIMINGS, type Timings } from "./timers.ts";

export type GameServerOptions = {
  timings?: Partial<Timings>; // tests use short timers
  clientDir?: string; // built React app; unset = API only (dev uses the Vite proxy)
};

export function createGameServer(options: GameServerOptions = {}) {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  if (options.clientDir) {
    const clientDir = resolve(options.clientDir);
    app.use(express.static(clientDir));
    // Client-side routes: any other GET gets the app (Socket.IO handles /socket.io first)
    app.get("/{*path}", (_req, res) => {
      res.sendFile(resolve(clientDir, "index.html"));
    });
  }

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
