# @infinitecanvas/ecs-sync-server

A reusable, framework-agnostic Node.js library for real-time ECS state synchronization.
Inspired by tldraw's `TLSocketRoom` pattern, adapted for the `@infinitecanvas/ecs-sync` protocol.

## Goals

- **Drop-in server** for the existing `ecs-sync` client (same WebSocket protocol)
- **Framework-agnostic** -- works with Express, Fastify, Bun, Cloudflare Workers, raw `ws`, etc.
- **Pluggable persistence** -- bring your own storage backend
- **Single-process rooms** -- one `Room` instance per document, manages all connected clients
- **Zero ECS dependency** -- the server doesn't run a World; it's a patch router with conflict resolution

---

## Core API

### `Room`

The central abstraction. One instance per document/room. Manages state, timestamps, and connected sessions.

```ts
import { Room } from '@infinitecanvas/ecs-sync-server'

const room = new Room({
  // Optional: restore from a previous snapshot
  initialSnapshot?: RoomSnapshot,

  // Optional: pluggable persistence
  storage?: SyncStorage,

  // Optional: called when document state changes (for manual persistence)
  onDataChange?: (room: Room) => void,

  // Optional: called when a session disconnects
  onSessionRemoved?: (room: Room, info: { sessionId: string, remaining: number }) => void,
})
```

### Connecting clients

The server hands off a WebSocket to the room. The room handles the protocol from there.

```ts
room.handleSocketConnect({
  sessionId: string, // unique per browser tab / connection
  socket: WebSocketLike, // any object matching the minimal interface below
  clientId: string, // stable client identity (used for ephemeral namespacing)
});
```

### `WebSocketLike` interface

Minimal contract so we aren't tied to any WebSocket library:

```ts
interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(
    event: "message",
    handler: (ev: { data: string }) => void,
  ): void;
  addEventListener(event: "close", handler: () => void): void;
  addEventListener(event: "error", handler: (err: unknown) => void): void;
}
```

For environments like Bun or Cloudflare Workers where the socket doesn't support `addEventListener`, provide manual message forwarding:

```ts
room.handleSocketMessage(sessionId: string, data: string): void
room.handleSocketClose(sessionId: string): void
room.handleSocketError(sessionId: string, error: unknown): void
```

### State access

```ts
// Get a serializable snapshot of the room (for persistence / backup)
room.getSnapshot(): RoomSnapshot

// Get current connected session count
room.getSessionCount(): number

// Get session metadata
room.getSessions(): SessionInfo[]

// Shut down the room, disconnect all clients
room.close(): void
```

---

## Protocol (unchanged from existing Go server)

The wire protocol stays identical so the existing `ecs-sync` client works without changes.

### Client -> Server

| Type        | Fields                                                   | Purpose                 |
| ----------- | -------------------------------------------------------- | ----------------------- |
| `patch`     | `messageId`, `documentPatches?`, `ephemeralPatches?`     | Send local changes      |
| `reconnect` | `lastTimestamp`, `documentPatches?`, `ephemeralPatches?` | Rejoin after disconnect |

### Server -> Client

| Type          | Fields                                                           | Purpose                     |
| ------------- | ---------------------------------------------------------------- | --------------------------- |
| `ack`         | `messageId`, `timestamp`                                         | Confirm receipt of a patch  |
| `patch`       | `documentPatches?`, `ephemeralPatches?`, `clientId`, `timestamp` | Broadcast changes           |
| `clientCount` | `count`                                                          | Number of connected clients |

---

## Persistence: `SyncStorage`

Pluggable interface for durable storage. Two built-in options, or bring your own.

```ts
interface SyncStorage {
  // Load the full room state. Called once when the room is created.
  load(): Promise<RoomSnapshot | null>;

  // Persist changes. Called whenever document state changes.
  // Receives the full snapshot -- implementors can diff if they want.
  save(snapshot: RoomSnapshot): Promise<void>;
}
```

### Built-in: `MemoryStorage`

Default. State lives only in memory. Useful for development or transient rooms.

```ts
import { MemoryStorage } from "@infinitecanvas/ecs-sync-server";

const room = new Room({
  storage: new MemoryStorage(),
});
```

### Built-in: `FileStorage`

Saves snapshots as JSON files. Simple, good for prototyping.

```ts
import { FileStorage } from "@infinitecanvas/ecs-sync-server";

const room = new Room({
  storage: new FileStorage({ dir: "./data", roomId: "my-room" }),
});
```

### Custom: SQLite, Redis, S3, etc.

```ts
const storage: SyncStorage = {
  async load() {
    const row = await db.query("SELECT snapshot FROM rooms WHERE id = ?", [
      roomId,
    ]);
    return row ? JSON.parse(row.snapshot) : null;
  },
  async save(snapshot) {
    await db.query(
      "INSERT INTO rooms (id, snapshot) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET snapshot = ?",
      [roomId, JSON.stringify(snapshot), JSON.stringify(snapshot)],
    );
  },
};
```

---

## `RoomSnapshot`

Serializable representation of the full room state:

```ts
interface RoomSnapshot {
  // Global monotonic version counter
  timestamp: number;

  // Document state: key -> component data
  // Keys are "stableId/componentName" or "SINGLETON/singletonName"
  state: Record<string, ComponentData>;

  // Per-field modification timestamps (for reconnect diffing)
  timestamps: Record<string, Record<string, number>>;
}
```

Ephemeral state is **not** included in snapshots -- it's transient by nature.

---

## Room Manager

A helper for managing multiple rooms.

```ts
import { RoomManager } from '@infinitecanvas/ecs-sync-server'

const manager = new RoomManager({
  // Factory for creating storage per room
  createStorage: (roomId: string) => new FileStorage({ dir: './data', roomId }),

  // Optional: auto-close empty rooms after this many ms (default: 30000)
  idleTimeout?: number,
})

// Get or create a room
const room = await manager.getRoom('my-room')

// Connect a client
room.handleSocketConnect({ sessionId, socket, clientId })

// List active rooms
manager.getRoomIds(): string[]

// Shut down everything
manager.closeAll(): void
```

---

## Integration Examples

### Express + ws

```ts
import express from "express";
import { WebSocketServer } from "ws";
import { RoomManager, FileStorage } from "@infinitecanvas/ecs-sync-server";

const app = express();
const server = app.listen(8087);
const wss = new WebSocketServer({ server });

const manager = new RoomManager({
  createStorage: (roomId) => new FileStorage({ dir: "./data", roomId }),
});

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url!, "http://localhost");
  const roomId = url.searchParams.get("roomId") ?? "default";
  const clientId = url.searchParams.get("clientId")!;

  const room = await manager.getRoom(roomId);
  room.handleSocketConnect({
    sessionId: crypto.randomUUID(),
    socket: ws,
    clientId,
  });
});
```

### Bun

```ts
import { RoomManager, FileStorage } from "@infinitecanvas/ecs-sync-server";

const manager = new RoomManager({
  createStorage: (roomId) => new FileStorage({ dir: "./data", roomId }),
});

// Track session -> room mapping for message routing
const sessions = new Map<string, { room: Room; sessionId: string }>();

Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const roomId = url.searchParams.get("roomId") ?? "default";
      const clientId = url.searchParams.get("clientId")!;
      const sessionId = crypto.randomUUID();
      server.upgrade(req, { data: { roomId, clientId, sessionId } });
      return undefined;
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    async open(ws) {
      const { roomId, clientId, sessionId } = ws.data;
      const room = await manager.getRoom(roomId);
      room.handleSocketConnect({ sessionId, socket: ws, clientId });
    },
    message(ws, message) {
      // If using manual message forwarding:
      // room.handleSocketMessage(sessionId, message)
    },
    close(ws) {
      // Handled automatically if socket supports addEventListener
    },
  },
});
```

---

## Open Questions

1. **Multi-room per connection?** The current Go server is single-room. Should we support multiplexing multiple rooms over one WebSocket? (Probably not for v1 -- keep it simple.)

No, just one room per connection

2. **Authorization hooks?** Should the room support an `onBeforeConnect` callback for auth checks, or leave that to the framework layer? Leaning toward leaving it to the framework.

Yes

3. **Throttled persistence?** tldraw throttles saves to every 10 seconds. Should `Room` handle throttling internally, or leave it to the `SyncStorage` implementation? Leaning toward a built-in `saveThrottleMs` option on `Room`.

Yes, built-in option on Room

4. **Read-only sessions?** Worth supporting? Could be useful for spectator/viewer mode. Easy to add: skip applying patches from read-only sessions.

No

5. **Room-level middleware/hooks?** e.g., `onBeforePatch(patch, session) => patch | null` for server-side validation or transformation. Nice to have but not essential for v1.

No

6. **Max connections per room?** Should the room enforce a limit, or leave it to the consumer?

No

7. **Heartbeat/keepalive?** The Go server uses ping/pong with 20s timeout. Should we replicate this, or rely on the WebSocket library's built-in keepalive?

Use build-in keepalive

---

## Package Structure

```
packages/ecs-sync-server/
  src/
    index.ts              # Public exports
    Room.ts               # Core room class
    types.ts              # RoomSnapshot, ComponentData, protocol messages
    WebSocketLike.ts      # Minimal WebSocket interface
    RoomManager.ts        # Optional multi-room helper
    storage/
      SyncStorage.ts      # Storage interface
      MemoryStorage.ts    # In-memory (default)
      FileStorage.ts      # JSON file persistence
```

---

## Non-Goals (for v1)

- Running an actual ECS World on the server (this is a patch router, not a game server)
- Schema validation of component data (the server is schema-agnostic)
- Built-in HTTP framework or routing
- Binary protocol (JSON is fine for now)
- Conflict resolution beyond last-write-wins at the field level
