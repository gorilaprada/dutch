import { createGameServer } from "./app.ts";
import { hasClientBuild, resolveClientDir } from "./config.ts";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const CLIENT_DIR = resolveClientDir(process.env.CLIENT_DIR); // e.g. client/dist in production

if (CLIENT_DIR && !hasClientBuild(CLIENT_DIR)) {
  console.warn(`No index.html in ${CLIENT_DIR}: run \`pnpm build\` first, the page will 404`);
}

const server = createGameServer({ clientDir: CLIENT_DIR });
server.httpServer.listen(PORT, HOST, () => {
  console.log(`Dutch server listening on ${HOST}:${PORT}`);
  console.log(CLIENT_DIR ? `Serving client from ${CLIENT_DIR}` : "No CLIENT_DIR: API only");
});

// Stop timers and close sockets cleanly (Ctrl-C, container stop)
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down`);
  await server.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
