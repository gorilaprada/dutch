import type { Server, Socket } from "socket.io";
import { applyMove, parseMove, viewFor } from "../../src/entrypoint.ts";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./events.ts";
import { createRoom, findRoom, type Room, type RoomRegistry } from "./rooms.ts";

export type DutchServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type DutchSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const MAX_NAME_LENGTH = 20;

export function registerHandlers(io: DutchServer, socket: DutchSocket, rooms: RoomRegistry): void {
  socket.on("createRoom", payload => {
    if (socket.data.code !== undefined) return socket.emit("roomError", "Already in a room");
    const name = parseName(payload);
    if (name === null) return socket.emit("roomError", "Invalid name");

    const room = createRoom(rooms);
    if (!joinRoom(io, socket, room, name)) rooms.delete(room.code);
  });

  socket.on("joinRoom", payload => {
    if (socket.data.code !== undefined) return socket.emit("roomError", "Already in a room");
    const name = parseName(payload);
    const code = isObj(payload) && typeof payload.code === "string" ? payload.code : null;
    if (name === null || code === null) return socket.emit("roomError", "Invalid room code or name");

    const room = findRoom(rooms, code);
    if (!room) return socket.emit("roomError", "Room not found");
    joinRoom(io, socket, room, name);
  });

  socket.on("move", payload => {
    const room = roomOf(rooms, socket);
    const seat = socket.data.seat;
    if (!room || seat === undefined) return socket.emit("moveError", "Join or create a room first");

    // Seat comes from the session, never from the payload
    const move = parseMove(payload, seat);
    if (!move) return socket.emit("moveError", "Invalid move");
    // Joining goes through createRoom / joinRoom so the server can store the name
    if (move.type === "addPlayer") return socket.emit("moveError", "Use joinRoom to join");

    const result = applyMove(room.state, move, Math.random);
    if (!result.ok) return socket.emit("moveError", result.error);
    room.state = result.state;

    if (move.type === "leave") leaveRoom(rooms, socket, room);
    broadcast(io, room);
  });

  socket.on("disconnect", () => {
    const room = roomOf(rooms, socket);
    const seat = socket.data.seat;
    if (!room || seat === undefined) return;

    // Eliminated players (spectators) are no longer in the game state
    if (room.state.players.has(seat)) {
      const result = applyMove(room.state, { type: "leave", seat }, Math.random);
      if (result.ok) room.state = result.state;
    }
    leaveRoom(rooms, socket, room);
    broadcast(io, room);
  });
}

// Sends every socket in the room its own view: cards it may not see are hidden
export function broadcast(io: DutchServer, room: Room): void {
  const socketIds = io.sockets.adapter.rooms.get(room.code) ?? new Set<string>();
  const names = Object.fromEntries(room.names);

  for (const id of socketIds) {
    const socket = io.sockets.sockets.get(id);
    if (!socket) continue;

    const seat = socket.data.seat;
    const viewer = seat !== undefined && room.state.players.has(seat) ? seat : null;
    const result = viewFor(room.state, viewer);
    if (result.ok) socket.emit("view", { code: room.code, names, view: result.view });
  }
}

// ========= Helper functions =============
function joinRoom(io: DutchServer, socket: DutchSocket, room: Room, name: string): boolean {
  const result = applyMove(room.state, { type: "addPlayer" }, Math.random);
  if (!result.ok) {
    socket.emit("roomError", result.error);
    return false;
  }

  const action = result.state.lastAction;
  if (action?.type !== "join") return false;

  room.state = result.state;
  room.names.set(action.seat, name);
  socket.data.code = room.code;
  socket.data.seat = action.seat;
  socket.join(room.code);

  socket.emit("roomJoined", { code: room.code, seat: action.seat });
  broadcast(io, room);
  return true;
}

function leaveRoom(rooms: RoomRegistry, socket: DutchSocket, room: Room): void {
  if (socket.data.seat !== undefined) room.names.delete(socket.data.seat);
  socket.leave(room.code);
  socket.data.code = undefined;
  socket.data.seat = undefined;

  // The room lives as long as someone is connected to it, spectators included
  if (room.names.size === 0) rooms.delete(room.code);
}

function roomOf(rooms: RoomRegistry, socket: DutchSocket): Room | undefined {
  return socket.data.code === undefined ? undefined : rooms.get(socket.data.code);
}

function parseName(payload: unknown): string | null {
  if (!isObj(payload) || typeof payload.name !== "string") return null;
  const name = payload.name.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
