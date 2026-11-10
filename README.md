# Dutch

A real-time, multiplayer online version of Dutch, a memory and bluffing card game for 2–4 players. Built in TypeScript end to end, containerized with Docker and self-hosted on my home server behind a Cloudflare Tunnel.

**▶ Play it live at [playdutch.party](https://playdutch.party)**

<img width="960" height="523" alt="Dutch gameplay" src="https://github.com/user-attachments/assets/06970439-db67-494f-9778-960e335a4ad9" />

## Description

I made this game to play with my friends. I started building it with object-oriented design, but it didn't work well because the game state was scattered across objects, which made the rules hard to follow and slowed every change down. I rebuilt it with data-oriented design: plain, immutable data and pure functions that turn one game state into the next. Now I can add rules, fix bugs and ship features with ease, and my friends (and anyone else) can play together from anywhere.

**Highlights**

- **Pure rules engine** (`src/`): every move is a function that returns a new state or an error. No I/O, so the whole game is easy to test.
- **Real-time server** (`server/`): Express 5 + Socket.IO 4 with rooms, sessions, reconnects and timed phases. Each player gets their own view of the game, so hidden cards never leave the server and nobody can cheat by inspecting network traffic.
- **Animated client** (`client/`): React 19 + Vite + Motion, with card flights, flips, deals and spectator mode.
- **Tested**: unit tests for the rules, server tests, component tests and end-to-end games against a real server.
- **Production-ready deployment**: a Docker image that runs as an unprivileged user, has a `/health` check and shuts down cleanly on `SIGTERM`. Self-hosted on my home server and exposed to the internet through Cloudflare Tunnels.

## Motivation

Dutch is a card game I played with my friends often. Since moving out a couple of months ago I haven't been able to play with them, so I recreated it and put it online for everyone to play.

It also turned into my biggest learning project. Switching from OOP to data-oriented design taught me how much simpler code becomes when data and behavior are kept apart: with plain data I could read the whole game state at a glance, which made me much faster. Along the way I also learned to design a client/server protocol, keep secret information on the server, handle reconnects and timers, and deploy and operate a containerized app myself.

## Quick Start

Requirements: Node **26+** and pnpm **12** (the exact version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

This starts the server on `:3000` and the client on http://localhost:5173. Open it in two tabs: each tab is its own player.

Or run the production build with Docker:

```sh
docker build -t dutch .
docker run -p 3000:3000 dutch
```

Then open http://localhost:3000.

## Usage

### How to play

- Everyone starts with 50 points and 4 face-down cards, and memorizes two of them at the start of each round.
- On your turn, draw from the deck or the discard pile, then switch the drawn card into your hand or discard it. A card taken from the discard pile can't go straight back.
- A Jack put on the discard pile swaps two cards between two different players; a Queen lets you peek at any card.
- Any player can stack a card matching the top of the discard pile, once per discard. A wrong stack costs a penalty card.
- Instead of drawing, call **Dutch**: everyone else gets one last turn, then all hands are revealed.
- Each player loses the points in their hand (black kings count 0). At 0 points or less you're out. The last player standing wins.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Server and client in watch mode |
| `pnpm test` | Rules library tests |
| `pnpm test:all` | Library, server and client tests, including end-to-end games |
| `pnpm typecheck` | Type-checks all three packages |
| `pnpm build` | Builds the client into `client/dist` |
| `pnpm start` | Production: one process serves the client and the sockets on `:3000` |

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP and Socket.IO port |
| `HOST` | `0.0.0.0` | Interface to listen on |
| `CLIENT_DIR` | `client/dist` in `pnpm start` and Docker | Built client to serve. Unset = API only |

Game state lives in memory, so restarting the server ends every game in progress.

## Contributing

Contributions are welcome! Open an issue to report a bug or suggest a feature, or send a pull request.

1. Fork the repo and create a branch.
2. Make your change and add tests for it.
3. Run `pnpm typecheck` and `pnpm test:all` before opening the PR.

Where things live:

```
src/                rules library (entrypoint.ts: applyMove, parseMove, viewFor)
tests/              rules library tests
server/src/         app, event handlers, rooms, timers, protocol types
server/PROTOCOL.md  the client ↔ server contract
client/src/         game state, components, screens, styles
client/tests/       component tests and end-to-end flows
```

[`server/PROTOCOL.md`](server/PROTOCOL.md) documents every event, what each player can see, sessions, reconnects and errors.
