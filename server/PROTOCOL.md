# Dutch: client ↔ server protocol

This is the contract the React client is built against. Every type mentioned here can be imported with:

```ts
import type {
  ClientEvents, ServerToClientEvents, ClientMove,
  RoomView, PlayerView, SeatView, PeekView, Action, RoundScore, Card, Phase,
} from "../server/src/protocol.ts";
```

The import is type-only, so it adds no server code to the client bundle.

## Connecting

```ts
import { io, type Socket } from "socket.io-client";
const socket: Socket<ServerToClientEvents, ClientEvents> = io(); // same origin
```

- **Production:** Express serves the built client from `CLIENT_DIR`, and Socket.IO runs on the same host, so no CORS is needed. Any unknown GET returns `index.html`, so client-side routes work.
- **Dev:** `pnpm dev` at the repo root runs the server (on `:3000`) and the Vite dev server together. Vite proxies Socket.IO in `client/vite.config.ts`:

  ```ts
  export default defineConfig({
    server: { proxy: { "/socket.io": { target: "http://localhost:3000", ws: true } } },
  });
  ```

- **Server environment:**
  - `PORT` (default `3000`)
  - `HOST` (default `0.0.0.0`)
  - `CLIENT_DIR`. Leave it unset for API only.

### ⚠️ Attach listeners before emitting

Socket.IO doesn't buffer events. Some actions answer with two events back to back: `roomJoined` and then `view`. Attach every listener once, when the app starts, rather than per action, or the second event can be lost.

## Events

### Client → server (`ClientEvents`)

| Event | Payload | When |
|---|---|---|
| `createRoom` | `{ name }` | Landing page. Names are trimmed and must be 1–20 characters |
| `joinRoom` | `{ code, name }` | Landing page. The code is case-insensitive |
| `resume` | `{ token }` | After a reconnect or page reload, if a token is stored |
| `move` | `ClientMove` | Any game move (see below). Never include a seat |
| `sit` | none | A watcher takes a free seat. Lobby only |
| `rematch` | none | Starts a new game in the same room. Only when the phase is `finished` |

**`ClientMove`:**
- `{ type: "ready" }`
- `{ type: "start" }`: anyone can send it, and it only works once every player is ready
- `{ type: "draw", from: "drawPile" | "discardPile" }`
- `{ type: "switch", handIndex }`
- `{ type: "discard" }`
- `{ type: "stack", handIndex }`
- `{ type: "jack", seat1, i1, seat2, i2 }`
- `{ type: "queen", targetSeat, handIndex }`
- `{ type: "dutch" }`
- `{ type: "leave" }`

The server works out your seat from your session. The timed moves (end of memorizing, end of a peek, scoring) are sent only by the server.

### Server → client (`ServerToClientEvents`)

| Event | Payload | Sent to | Meaning |
|---|---|---|---|
| `roomJoined` | `{ code, seat: number \| null, token }` | You | You're in a room. `seat: null` means you're watching. It's sent again whenever your seat changes (`sit`, `rematch`) |
| `view` | `RoomView` | Each socket, with its own copy | After **every** change. Render from the latest one |
| `roomError` | `string` | You | Room-level problem (see Errors) |
| `moveError` | `string` | You | Your move was refused. Nobody else is told |

## `RoomView`

```ts
{
  code: string;                         // room code to share
  names: Record<seat, string>;          // seated players only
  connected: Record<seat, boolean>;     // false = disconnected, seat held
  graceDeadlines: Record<seat, number>; // disconnected seats: epoch ms until removal
  watchers: string[];                   // names of watch-only people
  eliminated: seat[];                   // seats that are out, now spectating
  view: PlayerView;                     // the game, as YOU may see it
  deadline: number | null;              // epoch ms when the current timed phase ends
}
```

JSON turns record keys into strings, so `names["0"]` and `names[0]` both work.

## `PlayerView`

| Field | Notes |
|---|---|
| `you` | Your seat, or `null` if you're spectating |
| `players: SeatView[]` | Sorted by seat. Each has `{ seat, hand, hasDrawnCard, drawnCard, score, isReady }` |
| `hand: (Card \| null)[]` | `null` means face down. **A hidden card carries no data at all**; draw a card back. Positions are stable, so use them as `handIndex` |
| `drawnCard` | Only filled for you. Other players only see `hasDrawnCard` |
| `drawPileCount`, `topDiscard` | The draw pile is only a count |
| `phase` | `lobby → memorizing → drawing ⇄ deciding → (power_jack \| power_queen → peeking) → … → scoring → memorizing … → finished` |
| `turnIndex` | The seat whose turn it is |
| `fromDiscard` | The current player drew from the discard pile, so they can't discard that card ("takers keepers"). Hide the discard button |
| `canStack` | Whether stacking on the current top discard is still possible |
| `peek: PeekView \| null` | `{ peeker, targetSeat, handIndex, card }`. `card` is filled only for the peeker |
| `dutch` | `{ seat }` once Dutch is called. Show a banner |
| `lastAction`, `actionSeq` | What just happened (see Animating) |

`Card` is `{ id, suit: "♤" | "♡" | "♢" | "♧", value: 1–13 }`.

## What is visible when

| Phase | Your own hand | Other hands |
|---|---|---|
| `memorizing` | Index 0 and 1 face up, the rest hidden | Hidden |
| `drawing` … `peeking` | Hidden, except your drawn card and your peek | Hidden |
| `scoring` | All face up | All face up |

Spectators see what an opponent sees: nothing during play, and everything during `scoring`.

## Game flow

1. **Landing:** the player enters a name and either sends `createRoom` or sends `joinRoom` with the code someone shared. Store the `token` from `roomJoined` (see Sessions).
2. **Lobby:** each player sends `move {ready}`, then anyone sends `move {start}`. This needs 2–4 players, all ready. A full lobby, or a game that's already running, makes you a watcher.
3. **`memorizing`:** this lasts `deadline - now`. Show a countdown, with your index 0 and 1 face up. The top card is already on the discard pile.
4. **Turn loop:** only the player at `turnIndex` acts.
   - **`drawing`:** `draw` from either pile, or call `dutch` instead of drawing.
   - **`deciding`:** `switch` a hand card with the drawn card, or `discard` the drawn card (not allowed when `fromDiscard`).
     - Discarding or switching away a **Jack (11)** moves to `power_jack`. Send `jack`, which swaps cards between any two *different* players without anyone seeing them.
     - A **Queen (12)** moves to `power_queen`. Send `queen`. The phase becomes `peeking` for about 3 s, and only you see `peek.card`.
     - Powers are mandatory.
5. **Stacking:** at any time except `memorizing`, `peeking`, `scoring` and `finished`, **any** player can send `stack {handIndex}` for a card matching the top discard's value.
   - Only one stack is allowed per discard (`canStack`).
   - A wrong stack reveals the card to everyone in `lastAction` and adds a penalty card to the end of that hand.
   - Stacking your last card ends the round straight away.
6. **Dutch:** every other player gets one more turn. When it's the caller's turn again, the phase becomes `scoring`.
7. **`scoring`:** all hands are face up for about 5 s (`deadline`).
   - Then `lastAction` becomes `{ type: "countPoints", summary }`, with one `RoundScore` per player: `{ seat, pointsLost, score, eliminated }`. Black kings count 0, and every other card counts its value.
   - If 2 or more players are left, the next round is dealt straight away (back to `memorizing`), and the player who lost the fewest points starts.
8. **`finished`:** shown when one player is left. Anyone can send `rematch`, which seats everyone connected (up to 4) in a fresh lobby. Each person's new seat arrives in `roomJoined`.

## Sessions and reconnecting

- **Storing the token:** keep `token` in **`sessionStorage`**, so each tab is its own player. Anyone who has the token can take the seat.
- **Resuming:** when the socket connects and a token is stored, send `resume {token}` before anything else.
  - It succeeds with `roomJoined` and then `view`.
  - On `roomError "Session expired"`, clear the token and show the landing page.
- **Disconnecting mid-game:** your seat is held for 30 s. Other players see `connected[seat] === false` and a `graceDeadlines[seat]` countdown, and the game waits on your turn. Once the time runs out, you're removed.
- **When there's no grace:** disconnecting in the lobby, or as a spectator, removes you straight away.
- **Another tab:** opening the same token in a second tab moves the seat there, and the old tab gets `roomError "Opened in another tab"`.

## Animating with `lastAction`

`actionSeq` goes up by 1 with every action and never goes backwards, not even across rounds or rematches. Animate when it changes, and ignore a repeated view. `lastAction` only ever holds public information.

| `lastAction.type` | Fields | Suggested animation |
|---|---|---|
| `join` / `ready` / `leave` | `seat` | Lobby updates |
| `start` | none | Deal |
| `endMemorizing` | none | Flip the visible cards face down |
| `draw` | `seat`, `from`, and `card` (only `from: "discardPile"`) | Card moves to the player |
| `switch` | `seat`, `handIndex`, `discarded` | Swap, then `discarded` goes to the pile |
| `discard` | `seat`, `discarded` | Drawn card goes to the pile |
| `stack` | `seat`, `handIndex`, `card`, `success` | Success: card to the pile. Failure: flash the card, then a penalty card goes to the hand |
| `jack` | `seat`, `seat1`, `i1`, `seat2`, `i2` | Swap the two slots |
| `queen` | `seat`, `targetSeat`, `handIndex` | Highlight the peeked slot |
| `endPeek` | `seat` | Hide the peek |
| `dutch` | `seat` | "DUTCH" banner |
| `countPoints` | `summary: RoundScore[]` | Round summary, eliminations |

## Errors

All errors are plain strings meant to be shown to the player as they are. They aren't stable codes.

**`roomError`:**

| Message | Meaning |
|---|---|
| `Invalid name` / `Invalid room code or name` | The name is empty or longer than 20 characters, or the code is missing |
| `Room not found` | Wrong code |
| `Already in a room` | Leave the current room first |
| `Session expired` | The token is unknown or ended. Clear it |
| `Opened in another tab` | This tab lost the seat |
| `Join or create a room first` | `sit` or `rematch` was sent without being in a room |
| `Already seated` / `Can only sit in the lobby` / `Lobby full` | `sit` was refused |
| `Game is not finished` | `rematch` was sent too early |

**`moveError`:**

| Message | Meaning |
|---|---|
| `Join or create a room first` | No session |
| `Invalid move` | The payload's shape is wrong, or it's a server-only move |
| `Spectators cannot play` | You're a watcher or eliminated. Only `leave` works |
| `Use joinRoom to join` | Don't send `addPlayer` |

Rule errors come from the game itself, for example:
- `Not your turn`
- `Not drawing right now` / `Not deciding right now`
- `Takers keepers` (discarding a card taken from the discard pile)
- `Discard Pile is empty`
- `Cannot stack right now`
- `Cannot switch cards from the same hand`
- `Invalid target card` / `Invalid move`
- `No queen power to execute` / `Forbidden move`
- `Cannot call dutch at this moment` / `Dutch already called`
- `Not everyone is ready` / `Must be at least 2 players` / `Game already started`
- `No card at index: N` / `No drawn card`
- `Player not found` / `Players not found`
