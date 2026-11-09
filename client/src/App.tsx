import { MotionConfig } from "motion/react";
import { NoticeStack } from "./components/NoticeStack.tsx";
import { useGame } from "./game/useGame.ts";
import { Landing } from "./screens/Landing.tsx";
import { Lobby } from "./screens/Lobby.tsx";
import { Table } from "./screens/Table.tsx";

export function App() {
  const { state, actions } = useGame();
  const { room, roomView } = state;

  // Reduced motion (an OS setting): no flying cards, flips become fades
  return (
    <MotionConfig reducedMotion="user">
      <div className="room">
        {room !== null && !state.connected ? (
          <div className="banner banner-offline" role="status">Connection lost: reconnecting…</div>
        ) : null}
        {room === null
          ? state.resuming ? <Waiting text="Reconnecting to your table…" /> : <Landing />
          : roomView === null
            ? <Waiting text="Joining the table…" />
            : roomView.view.phase === "lobby"
              ? <Lobby roomView={roomView} />
              : <Table roomView={roomView} />}

        <NoticeStack notices={state.notices} onDismiss={actions.dismissNotice} />
      </div>
    </MotionConfig>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="centered">
      <p className="hint">{text}</p>
    </div>
  );
}
