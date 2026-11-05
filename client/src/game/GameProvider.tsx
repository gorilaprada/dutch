import { createContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { ClientMove, ServerToClientEvents } from "./protocol.ts";
import { initialState, reducer, SESSION_LOST, type GameStoreState } from "./reducer.ts";
import { clearToken, getToken, setToken } from "./session.ts";
import type { GameSocket } from "./socket.ts";

export type GameActions = {
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  move: (move: ClientMove) => void;
  sit: () => void;
  rematch: () => void;
  leave: () => void;
  dismissNotice: (id: number) => void;
};

export type Game = {
  state: GameStoreState;
  actions: GameActions;
};

export const GameContext = createContext<Game | null>(null);

export function GameProvider({ socket, children }: { socket: GameSocket; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Every listener is attached once, before anything is emitted: Socket.IO
  // drops events that arrive while no listener exists (roomJoined + view)
  useEffect(() => {
    const onConnect = () => {
      dispatch({ type: "connected" });
      const token = getToken();
      if (token) {
        dispatch({ type: "resuming" });
        socket.emit("resume", { token });
      }
    };
    const onDisconnect = () => dispatch({ type: "disconnected" });
    const onRoomJoined: ServerToClientEvents["roomJoined"] = room => {
      setToken(room.token);
      dispatch({ type: "roomJoined", room });
    };
    const onView: ServerToClientEvents["view"] = roomView => dispatch({ type: "view", roomView });
    const onRoomError = (message: string) => {
      if (SESSION_LOST.includes(message)) clearToken();
      dispatch({ type: "roomError", message });
    };
    const onMoveError = (message: string) => dispatch({ type: "moveError", message });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("roomJoined", onRoomJoined);
    socket.on("view", onView);
    socket.on("roomError", onRoomError);
    socket.on("moveError", onMoveError);

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("view", onView);
      socket.off("roomError", onRoomError);
      socket.off("moveError", onMoveError);
    };
  }, [socket]);

  const actions = useMemo<GameActions>(() => ({
    createRoom: name => socket.emit("createRoom", { name }),
    joinRoom: (code, name) => socket.emit("joinRoom", { code, name }),
    move: move => socket.emit("move", move),
    sit: () => socket.emit("sit"),
    rematch: () => socket.emit("rematch"),
    // The server sends nothing back to a socket that left, so forget it here
    leave: () => {
      socket.emit("move", { type: "leave" });
      clearToken();
      dispatch({ type: "leftRoom" });
    },
    dismissNotice: id => dispatch({ type: "dismissNotice", id }),
  }), [socket]);

  const game = useMemo(() => ({ state, actions }), [state, actions]);
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}
