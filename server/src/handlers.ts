import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { applyMove, parseMove, viewFor } from "../../src/entrypoint.ts";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./events.ts";
import { createRoom, findRoom, clearGrace, type Room, type RoomRegistry, type Session } from "./rooms.ts";
import { schedule, clearTimer, type Timings } from "./timers.ts";

export type DutchServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type DutchSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export type ServerContext = {
  io: DutchServer;
  rooms: RoomRegistry;
  tokens: Map<string, string>; // session token -> room code
  timings: Timings;
};

const MAX_NAME_LENGTH = 20;

export function registerHandlers(ctx: ServerContext, socket: DutchSocket): void {
  const { rooms } = ctx;

  socket.on("createRoom", payload => {
    if (socket.data.code !== undefined) return socket.emit("roomError", "Already in a room");
    const name = parseName(payload);
    if (name === null) return socket.emit("roomError", "Invalid name");

    const room = createRoom(rooms);
    if (!joinRoom(ctx, socket, room, name)) rooms.delete(room.code);
  });

  socket.on("joinRoom", payload => {
    if (socket.data.code !== undefined) return socket.emit("roomError", "Already in a room");
    const name = parseName(payload);
    const code = isObj(payload) && typeof payload.code === "string" ? payload.code : null;
    if (name === null || code === null) return socket.emit("roomError", "Invalid room code or name");

    const room = findRoom(rooms, code);
    if (!room) return socket.emit("roomError", "Room not found");
    joinRoom(ctx, socket, room, name);
  });

  socket.on("resume", payload => {
    if (socket.data.code !== undefined) return socket.emit("roomError", "Already in a room");
    const token = isObj(payload) && typeof payload.token === "string" ? payload.token : null;
    const code = token === null ? undefined : ctx.tokens.get(token);
    const room = code === undefined ? undefined : rooms.get(code);
    const session = token === null ? undefined : room?.sessions.get(token);
    if (!room || !session) return socket.emit("roomError", "Session expired");

    // Same token from another tab: the newest socket takes the seat
    if (session.socketId !== null && session.socketId !== socket.id) {
      const old = ctx.io.sockets.sockets.get(session.socketId);
      if (old) {
        old.emit("roomError", "Opened in another tab");
        detach(old, room);
      }
    }

    clearGrace(session);
    attach(socket, room, session);
    commit(ctx, room);
  });

  socket.on("move", payload => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    if (!room || !session) return socket.emit("moveError", "Join or create a room first");

    // Seat comes from the session, never from the payload
    const move = parseMove(payload, session.seat);
    if (!move) return socket.emit("moveError", "Invalid move");
    // Joining goes through createRoom / joinRoom so the server can store the name
    if (move.type === "addPlayer") return socket.emit("moveError", "Use joinRoom to join");

    const result = applyMove(room.state, move, Math.random);
    if (!result.ok) return socket.emit("moveError", result.error);
    room.state = result.state;

    if (move.type === "leave") {
      detach(socket, room);
      endSession(ctx, room, session);
    }
    commit(ctx, room);
  });

  socket.on("disconnect", () => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    // Already detached, e.g. replaced by another tab
    if (!room || !session || session.socketId !== socket.id) return;

    // Seats are only held once a game is running and the player is in it
    const inGame = room.state.players.has(session.seat);
    if (room.state.phase === "lobby" || !inGame) {
      if (inGame) leaveGame(room, session.seat);
      endSession(ctx, room, session);
      return commit(ctx, room);
    }

    session.socketId = null;
    startGrace(ctx, room, session);
    commit(ctx, room);
  });
}

// Every state change goes through here: (re)arm the phase timer, then
// send the views. Timer first, so the views carry the new deadline
export function commit(ctx: ServerContext, room: Room): void {
  // A deleted room must not restart a timer
  if (ctx.rooms.get(room.code) !== room) return clearTimer(room);

  schedule(room, ctx.timings, move => {
    const result = applyMove(room.state, move, Math.random);
    if (result.ok) room.state = result.state;
    commit(ctx, room);
  });
  broadcast(ctx.io, room);
}

// Sends every socket in the room its own view: cards it may not see are hidden
export function broadcast(io: DutchServer, room: Room): void {
  const socketIds = io.sockets.adapter.rooms.get(room.code) ?? new Set<string>();
  const sessions = [...room.sessions.values()];
  const names = Object.fromEntries(sessions.map(s => [s.seat, s.name]));
  const connected = Object.fromEntries(sessions.map(s => [s.seat, s.socketId !== null]));
  const graceDeadlines = Object.fromEntries(
    sessions.flatMap(s => s.grace ? [[s.seat, s.grace.deadline]] : [])
  );
  const deadline = room.timer?.deadline ?? null;

  for (const id of socketIds) {
    const socket = io.sockets.sockets.get(id);
    if (!socket) continue;

    const seat = socket.data.seat;
    const viewer = seat !== undefined && room.state.players.has(seat) ? seat : null;
    const result = viewFor(room.state, viewer);
    if (result.ok) {
      socket.emit("view", { code: room.code, names, connected, graceDeadlines, view: result.view, deadline });
    }
  }
}

// Clears every room's phase and grace timers (server shutdown)
export function clearAllTimers(ctx: ServerContext): void {
  for (const room of ctx.rooms.values()) {
    clearTimer(room);
    for (const session of room.sessions.values()) clearGrace(session);
  }
}

// ========= Helper functions =============
function joinRoom(ctx: ServerContext, socket: DutchSocket, room: Room, name: string): boolean {
  const result = applyMove(room.state, { type: "addPlayer" }, Math.random);
  if (!result.ok) {
    socket.emit("roomError", result.error);
    return false;
  }

  const action = result.state.lastAction;
  if (action?.type !== "join") return false;
  room.state = result.state;

  const session: Session = { token: randomUUID(), seat: action.seat, name, socketId: null, grace: null };
  room.sessions.set(session.token, session);
  ctx.tokens.set(session.token, room.code);

  attach(socket, room, session);
  commit(ctx, room);
  return true;
}

// Binds a socket to a session's seat and tells it so (with its token)
function attach(socket: DutchSocket, room: Room, session: Session): void {
  session.socketId = socket.id;
  socket.data.code = room.code;
  socket.data.seat = session.seat;
  socket.data.token = session.token;
  socket.join(room.code);
  socket.emit("roomJoined", { code: room.code, seat: session.seat, token: session.token });
}

function detach(socket: DutchSocket, room: Room): void {
  socket.leave(room.code);
  socket.data.code = undefined;
  socket.data.seat = undefined;
  socket.data.token = undefined;
}

function startGrace(ctx: ServerContext, room: Room, session: Session): void {
  const ms = ctx.timings.reconnectMs;
  const handle = setTimeout(() => {
    session.grace = null;
    // Might already be out of the game, e.g. eliminated while away
    if (room.state.players.has(session.seat)) leaveGame(room, session.seat);
    endSession(ctx, room, session);
    commit(ctx, room);
  }, ms);
  session.grace = { deadline: Date.now() + ms, handle };
}

function leaveGame(room: Room, seat: number): void {
  const result = applyMove(room.state, { type: "leave", seat }, Math.random);
  if (result.ok) room.state = result.state;
}

// The room lives as long as it has sessions, disconnected ones included
function endSession(ctx: ServerContext, room: Room, session: Session): void {
  clearGrace(session);
  room.sessions.delete(session.token);
  ctx.tokens.delete(session.token);

  if (room.sessions.size === 0) {
    clearTimer(room);
    ctx.rooms.delete(room.code);
  }
}

function roomOf(rooms: RoomRegistry, socket: DutchSocket): Room | undefined {
  return socket.data.code === undefined ? undefined : rooms.get(socket.data.code);
}

function sessionOf(room: Room | undefined, socket: DutchSocket): Session | undefined {
  return socket.data.token === undefined ? undefined : room?.sessions.get(socket.data.token);
}

function parseName(payload: unknown): string | null {
  if (!isObj(payload) || typeof payload.name !== "string") return null;
  const name = payload.name.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
