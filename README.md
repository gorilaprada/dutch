# Dutch

An online version of Dutch, a memory and bluffing card game for 2–4 players, in three parts:

| Part | Folder | What it is |
|---|---|---|
| Rules library | `src/` | Pure TypeScript game logic. Immutable state; every move is a function that returns a new state or an error. No I/O |
| Server | `server/` | Express 5 + Socket.IO 4. Rooms, sessions and reconnects, timed phases, and one personal view per player (hidden cards never leave the server) |
| Client | `client/` | React 19 + Vite. Lobby, table, animations (Motion) |

The server runs TypeScript directly with Node's type stripping: only the client has a build step.

## The game in short

- Everyone starts with 50 points and 4 face-down cards, and memorizes two of them at the start of each round.
- On your turn, draw from the deck or the discard pile, then switch the drawn card into your hand or discard it. A card taken from the discard pile can't go straight back.
- A Jack you put on the discard pile (discarded or switched out) swaps two cards between two different players; a Queen lets you peek at any card.
- Any player can stack a card matching the top of the discard pile, once per discard. A wrong stack costs a penalty card.
- Instead of drawing, call **Dutch**: everyone else gets one last turn, then all hands are revealed.
- Each player loses the points in their hand (black kings count 0). At 0 points or less you're out. The last player standing wins.

## Requirements

- Node **26** or newer (type stripping)
- pnpm **12** (`packageManager` in `package.json` pins the exact version)

## Getting started

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the server on `:3000` (restarting on save) and Vite on `:5173`, which proxies `/socket.io` to the server. Open http://localhost:5173 in two tabs: each tab is its own player.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Server and client in watch mode |
| `pnpm test` | Rules library tests |
| `pnpm test:all` | Library, server and client tests (the client suite includes end-to-end games against a real server) |
| `pnpm typecheck` | Type-checks all three packages |
| `pnpm build` | Type-checks and builds the client into `client/dist` |
| `pnpm start` | Production: one process serves `client/dist` and the sockets on `:3000` |

## Production

```sh
pnpm build
pnpm start
```

### Docker

```sh
docker build -t dutch .
docker run -p 3000:3000 dutch
```

The image runs as the unprivileged `node` user, has a health check on `/health`, and shuts down cleanly on `SIGTERM` (timers stopped, sockets closed).

### Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP and Socket.IO port |
| `HOST` | `0.0.0.0` | Interface to listen on |
| `CLIENT_DIR` | unset (`client/dist` in `pnpm start` and Docker) | Built client to serve. A relative path is resolved from the repo root. Unset = API only, as in `pnpm dev` |

Game state lives in memory: restarting the server ends every game in progress, and one process serves all rooms.

## Repository layout

```
src/              rules library (entrypoint.ts: applyMove, parseMove, viewFor)
tests/            library tests
server/src/       app.ts, handlers.ts (events), rooms.ts, timers.ts, protocol.ts (types for clients)
server/PROTOCOL.md  the client ↔ server contract
client/src/       game/ (store, socket, selectors, animations), components/, screens/, styles/
client/tests/     component tests (fake socket) and end-to-end flows (real server)
```

## Further reading

- [`server/PROTOCOL.md`](server/PROTOCOL.md): events, views, what each player can see, sessions and reconnects, errors.
