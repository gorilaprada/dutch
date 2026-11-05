import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: the game server runs on :3000, Socket.IO stays same-origin through the proxy
    proxy: {
      "/socket.io": { target: "http://localhost:3000", ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
