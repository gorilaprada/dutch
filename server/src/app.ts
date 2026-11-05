import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerHandlers, type DutchServer } from "./handlers.ts";
import type { RoomRegistry } from "./rooms.ts";

export function createGameServer() {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const httpServer = createServer(app);
  const io: DutchServer = new Server(httpServer);
  const rooms: RoomRegistry = new Map();

  io.on("connection", socket => registerHandlers(io, socket, rooms));

  return { app, httpServer, io, rooms };
}
