import { useState, type FormEvent } from "react";
import { ActionButton } from "../components/ActionButton.tsx";
import { useGame } from "../game/useGame.ts";

const MAX_NAME = 20; // same limit as the server
const CODE_LENGTH = 4;

type Mode = "create" | "join";

// A shared link /?room=K7P9 opens on Join with the code filled in
function codeFromUrl(): string {
  const code = new URLSearchParams(window.location.search).get("room") ?? "";
  return code.trim().toUpperCase().slice(0, CODE_LENGTH);
}

export function Landing() {
  const { state, actions } = useGame();
  const [code, setCode] = useState(codeFromUrl);
  const [mode, setMode] = useState<Mode>(code ? "join" : "create");
  const [name, setName] = useState("");

  const trimmedName = name.trim();
  const canSubmit = state.connected
    && trimmedName.length > 0
    && (mode === "create" || code.length === CODE_LENGTH);

  const submit = () => {
    if (!canSubmit) return;
    if (mode === "create") actions.createRoom(trimmedName);
    else actions.joinRoom(code, trimmedName);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="centered">
      <div>
        <h1 className="logo">Dutch</h1>
        <p className="tagline">A memory-and-bluffing card game for 2–4 players. Lowest hand when Dutch is called takes the round.</p>
      </div>

      <form className="panel" onSubmit={onSubmit}>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" className="tab" aria-selected={mode === "create"} onClick={() => setMode("create")}>
            Create game
          </button>
          <button type="button" role="tab" className="tab" aria-selected={mode === "join"} onClick={() => setMode("join")}>
            Join game
          </button>
        </div>

        <label className="field">
          <span className="eyebrow">Your name</span>
          <input
            className="input"
            type="text"
            value={name}
            maxLength={MAX_NAME}
            placeholder="MARA"
            autoFocus
            onChange={event => setName(event.currentTarget.value)}
          />
        </label>

        {mode === "join" ? (
          <label className="field">
            <span className="eyebrow">Room code</span>
            <input
              className="input input-code"
              type="text"
              value={code}
              maxLength={CODE_LENGTH}
              placeholder="K7P9"
              spellCheck={false}
              onChange={event => setCode(event.currentTarget.value.toUpperCase())}
            />
          </label>
        ) : null}

        <ActionButton variant="primary" onClick={submit} disabled={!canSubmit}>
          {mode === "create" ? "DEAL ME IN" : "JOIN TABLE"}
        </ActionButton>

        <p className="hint">
          {!state.connected
            ? "Connecting to the table…"
            : mode === "create"
              ? "You'll get a link to share with the table."
              : "Ask the host for the 4-character code or link."}
        </p>
      </form>
    </div>
  );
}
