import { createGameServer } from "./app.ts";

const PORT = Number(process.env.PORT ?? 3000);

const { httpServer } = createGameServer();
httpServer.listen(PORT, () => {
  console.log(`Dutch server listening on :${PORT}`);
});
