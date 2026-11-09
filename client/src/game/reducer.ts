import type { PlayerView, RoomView } from "./protocol.ts";

export type Notice = {
  id: number;
  message: string;
  tone: "error" | "info";
};

export type JoinedRoom = {
  code: string;
  seat: number | null; // null = watcher
  token: string;
};

export type GameStoreState = {
  connected: boolean;
  resuming: boolean; // a resume was sent and has no answer yet
  room: JoinedRoom | null;
  roomView: RoomView | null;
  // The view before the latest action: animations compare it with the current one
  previousView: PlayerView | null;
  notices: readonly Notice[];
  nextNoticeId: number;
};

export type GameEvent =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "resuming" }
  | { type: "roomJoined"; room: JoinedRoom }
  | { type: "view"; roomView: RoomView }
  | { type: "roomError"; message: string }
  | { type: "moveError"; message: string }
  | { type: "dismissNotice"; id: number }
  | { type: "leftRoom" };

// These end our place in the room: back to the landing screen
export const SESSION_LOST = ["Session expired", "Opened in another tab"];

export const initialState: GameStoreState = {
  connected: false,
  resuming: false,
  room: null,
  roomView: null,
  previousView: null,
  notices: [],
  nextNoticeId: 1,
};

export function reducer(state: GameStoreState, event: GameEvent): GameStoreState {
  switch (event.type) {
    case "connected":
      return { ...state, connected: true };
    case "disconnected":
      // Keep the room: the provider resumes it on reconnect
      return { ...state, connected: false };
    case "resuming":
      return { ...state, resuming: true };
    case "roomJoined": {
      // Same room (sit, rematch, resume): keep the view until the next one arrives
      const sameRoom = state.room?.code === event.room.code;
      return {
        ...state,
        resuming: false,
        room: event.room,
        roomView: sameRoom ? state.roomView : null,
        previousView: sameRoom ? state.previousView : null,
      };
    }
    case "view": {
      const { roomView } = event;
      // Only views of the room we are in, and never an older one
      if (state.room?.code !== roomView.code) return state;
      const current = state.roomView?.view ?? null;
      if (current && roomView.view.actionSeq < current.actionSeq) return state;
      // A repeated view (same actionSeq) keeps the pair: nothing new happened
      const newAction = current === null || roomView.view.actionSeq > current.actionSeq;
      return { ...state, roomView, previousView: newAction ? current : state.previousView };
    }
    case "roomError": {
      const lost = SESSION_LOST.includes(event.message);
      const next = lost ? { ...state, room: null, roomView: null, previousView: null } : state;
      return notify({ ...next, resuming: false }, event.message, lost ? "info" : "error");
    }
    case "moveError":
      return notify(state, event.message, "error");
    case "dismissNotice":
      return { ...state, notices: state.notices.filter(notice => notice.id !== event.id) };
    case "leftRoom":
      return { ...state, room: null, roomView: null, previousView: null };
    default: {
      const unhandled: never = event;
      return unhandled;
    }
  }
}

// ========= Helper functions =============
function notify(state: GameStoreState, message: string, tone: Notice["tone"]): GameStoreState {
  return {
    ...state,
    notices: [...state.notices, { id: state.nextNoticeId, message, tone }],
    nextNoticeId: state.nextNoticeId + 1,
  };
}
