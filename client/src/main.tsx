import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { GameProvider } from "./game/GameProvider.tsx";
import { createSocket } from "./game/socket.ts";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <GameProvider socket={createSocket()}>
      <App />
    </GameProvider>
  </StrictMode>,
);
