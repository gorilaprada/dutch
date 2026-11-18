import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { applyMove, initGameState, parseMove, viewFor, type GameState, type Move } from "../../src/entrypoint.ts";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./events.ts";
import { createRoom, findRoom, clearGrace, type Room, type RoomRegistry, type Session } from "./rooms.ts";
import { schedule, clearTimer, type TimerEnd, type Timings } from "./timers.ts";

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

    joinRoom(ctx, socket, createRoom(rooms), name);
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

    // Watchers and eliminated players can only leave
    if (!isPlaying(room, session)) {
      if (!isObj(payload) || payload.type !== "leave") return socket.emit("moveError", "Spectators cannot play");
      detach(socket, room);
      endSession(ctx, room, session);
      return commit(ctx, room);
    }

    // Seat comes from the session, never from the payload
    const move = parseMove(payload, session.seat!);
    if (!move) return socket.emit("moveError", "Invalid move");
    // Joining goes through createRoom / joinRoom so the server can store the name
    if (move.type === "addPlayer") return socket.emit("moveError", "Use joinRoom to join");

    if (move.type === "leave") {
      leaveGame(room, move.seat);
      detach(socket, room);
      endSession(ctx, room, session);
      return commit(ctx, room);
    }
    if (room.roundBreak) return socket.emit("moveError", "The next round is about to start");

    const result = applyMove(room.state, move, Math.random);
    if (!result.ok) return socket.emit("moveError", result.error);
    room.state = result.state;
    commit(ctx, room);
  });

  // READY FOR NEXT ROUND: once every connected player is ready, the break ends early
  socket.on("nextRoundReady", () => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    if (!room || !session) return socket.emit("roomError", "Join or create a room first");
    if (!room.roundBreak) return socket.emit("roomError", "No round to get ready for");
    if (!isPlaying(room, session)) return socket.emit("roomError", "Only players in the next round can get ready");

    room.roundBreak.ready.add(session.seat!);
    commit(ctx, room);
  });

  // A watcher takes a free seat before the game starts
  socket.on("sit", () => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    if (!room || !session) return socket.emit("roomError", "Join or create a room first");
    if (session.seat !== null) return socket.emit("roomError", "Already seated");
    if (room.state.phase !== "lobby") return socket.emit("roomError", "Can only sit in the lobby");

    const seated = seatPlayer(room.state);
    if (!seated) return socket.emit("roomError", "Lobby full");

    room.state = seated.state;
    session.seat = seated.seat;
    attach(socket, room, session);
    commit(ctx, room);
  });

  // Anyone in the room resets a finished game to a lobby with everyone connected
  socket.on("rematch", () => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    if (!room || !session) return socket.emit("roomError", "Join or create a room first");
    if (room.state.phase !== "finished") return socket.emit("roomError", "Game is not finished");

    rematch(ctx, room);
  });

  socket.on("disconnect", () => {
    const room = roomOf(rooms, socket);
    const session = sessionOf(room, socket);
    // Already detached, e.g. replaced by another tab
    if (!room || !session || session.socketId !== socket.id) return;

    // Seats are only held once a game is running and the player is in it.
    // Spectators (watchers, eliminated) get no grace
    const seat = session.seat;
    const inGame = seat !== null && gameOf(room).players.has(seat);
    if (room.state.phase === "lobby" || !inGame) {
      if (inGame) leaveGame(room, seat);
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
  // Checked on every change: a ready click, but also a leave or a disconnect
  // can leave only ready players
  if (everyoneReady(room)) endRoundBreak(room);

  schedule(room, ctx.timings, end => {
    if (end.type === "endRoundBreak") endRoundBreak(room);
    else applyTimed(room, end);
    commit(ctx, room);
  });
  broadcast(ctx.io, room);
}

// Sends every socket in the room its own view: cards it may not see are hidden
export function broadcast(io: DutchServer, room: Room): void {
  const socketIds = io.sockets.adapter.rooms.get(room.code) ?? new Set<string>();
  const sessions = [...room.sessions.values()];
  const seated = sessions.flatMap(s => s.seat === null ? [] : [{ ...s, seat: s.seat }]);

  const names = Object.fromEntries(seated.map(s => [s.seat, s.name]));
  const connected = Object.fromEntries(seated.map(s => [s.seat, s.socketId !== null]));
  const graceDeadlines = Object.fromEntries(
    seated.flatMap(s => s.grace ? [[s.seat, s.grace.deadline]] : [])
  );
  const watchers = sessions.filter(s => s.seat === null).map(s => s.name);
  const eliminated = room.state.phase === "lobby"
    ? []
    : seated.filter(s => !gameOf(room).players.has(s.seat)).map(s => s.seat).sort((a, b) => a - b);
  const deadline = room.timer?.deadline ?? null;
  const roundBreak = room.roundBreak
    ? { summary: room.roundBreak.summary, ready: [...room.roundBreak.ready].sort((a, b) => a - b) }
    : null;

  for (const id of socketIds) {
    const socket = io.sockets.sockets.get(id);
    if (!socket) continue;

    const seat = socket.data.seat;
    // Eliminated during a round break: already watching, like after the deal
    const viewer = seat !== undefined && room.state.players.has(seat) && gameOf(room).players.has(seat) ? seat : null;
    const result = viewFor(room.state, viewer);
    if (result.ok) {
      socket.emit("view", {
        code: room.code,
        names,
        connected,
        graceDeadlines,
        watchers,
        eliminated,
        view: result.view,
        deadline,
        roundBreak,
      });
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
// Seats the player if the lobby has room, otherwise they join as a watcher
function joinRoom(ctx: ServerContext, socket: DutchSocket, room: Room, name: string): void {
  const seated = room.state.phase === "lobby" ? seatPlayer(room.state) : null;
  if (seated) room.state = seated.state;

  const session: Session = {
    token: randomUUID(),
    seat: seated?.seat ?? null,
    name,
    socketId: null,
    grace: null,
  };
  room.sessions.set(session.token, session);
  ctx.tokens.set(session.token, room.code);

  attach(socket, room, session);
  commit(ctx, room);
}

// Fresh lobby: last game's players first (old seat order), then watchers
// (join order). Up to maxPlayers get a seat, the rest keep watching
function rematch(ctx: ServerContext, room: Room): void {
  // A lobby never holds seats, so disconnected sessions lose their spot
  for (const session of [...room.sessions.values()]) {
    if (session.socketId === null) endSession(ctx, room, session);
  }

  const sessions = [...room.sessions.values()];
  const order = [
    ...sessions.filter(s => s.seat !== null).sort((a, b) => a.seat! - b.seat!),
    ...sessions.filter(s => s.seat === null),
  ];

  // Keep counting actions so clients never see actionSeq go backwards
  let state: GameState = { ...initGameState(), actionSeq: room.state.actionSeq };
  for (const session of order) {
    const seated = seatPlayer(state);
    session.seat = seated?.seat ?? null;
    if (seated) state = seated.state;
  }

  clearTimer(room);
  room.state = state;
  for (const session of order) {
    const socket = session.socketId === null ? undefined : ctx.io.sockets.sockets.get(session.socketId);
    if (socket) attach(socket, room, session); // tells each socket its new seat
  }
  commit(ctx, room);
}

// Adds a player to the lib's game; null if the lobby is full
function seatPlayer(state: GameState): { state: GameState; seat: number } | null {
  const result = applyMove(state, { type: "addPlayer" }, Math.random);
  if (!result.ok || result.state.lastAction?.type !== "join") return null;
  return { state: result.state, seat: result.state.lastAction.seat };
}

// Binds a socket to a session's seat and tells it so (with its token)
function attach(socket: DutchSocket, room: Room, session: Session): void {
  session.socketId = socket.id;
  socket.data.code = room.code;
  socket.data.seat = session.seat ?? undefined;
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
    if (isPlaying(room, session)) leaveGame(room, session.seat!);
    endSession(ctx, room, session);
    commit(ctx, room);
  }, ms);
  session.grace = { deadline: Date.now() + ms, handle };
}

// During a round break the player leaves the held next round as well
function leaveGame(room: Room, seat: number): void {
  const leave: Move = { type: "leave", seat };
  const result = applyMove(room.state, leave, Math.random);
  if (result.ok) room.state = result.state;

  const pause = room.roundBreak;
  if (!pause) return;
  const next = applyMove(pause.next, leave, Math.random);
  if (next.ok) pause.next = next.state;
  pause.ready.delete(seat);
  // Fewer than 2 players left: there is no next round, the game is over now
  if (pause.next.phase === "finished") endRoundBreak(room);
}

// A timer ran out. A scored round that goes on starts the round break: the
// lib already dealt the next round, it waits in roundBreak until the break ends
function applyTimed(room: Room, move: Exclude<TimerEnd, { type: "endRoundBreak" }>): void {
  const result = applyMove(room.state, move, Math.random);
  if (!result.ok) return;
  const action = result.state.lastAction;
  if (action?.type === "countPoints" && result.state.phase !== "finished") {
    room.roundBreak = { next: result.state, summary: action.summary, ready: new Set() };
  } else {
    room.state = result.state;
  }
}

function endRoundBreak(room: Room): void {
  if (!room.roundBreak) return;
  room.state = room.roundBreak.next;
  room.roundBreak = null;
}

// Every connected player of the next round clicked ready. Disconnected ones
// don't block: the break timer still runs out for them
function everyoneReady(room: Room): boolean {
  const pause = room.roundBreak;
  if (!pause) return false;
  const connected = [...room.sessions.values()]
    .filter(s => s.seat !== null && s.socketId !== null && pause.next.players.has(s.seat))
    .map(s => s.seat!);
  return connected.length > 0 && connected.every(seat => pause.ready.has(seat));
}

// Who is in the game: during a round break, the players of the next round
function gameOf(room: Room): GameState {
  return room.roundBreak?.next ?? room.state;
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

// Seated and still in the lib's game (not a watcher, not eliminated)
function isPlaying(room: Room, session: Session): boolean {
  return session.seat !== null && gameOf(room).players.has(session.seat);
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
