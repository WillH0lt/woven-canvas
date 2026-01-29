# ECS Sync Implementation Plan

## Overview

A multiplayer local-first CRDT synchronizer using Last Write Wins (LWW) with a centralized authoritative server.

**Scope**: Client-side TypeScript only. Server will be Go (separate repo). All transports/storage are optional.

## Data Model

### Document Structure

```
Components: "<entityId>/<componentName>" → { ...componentData }
Singletons: "<singletonName>" → { ...singletonData }
```

### Wire Format (Operations)

Explicit operation type as first element:

```typescript
enum OpType {
  AddComponent = 0,
  UpdateComponent = 1,
  DeleteComponent = 2,
  UpdateSingleton = 3,
}

type Operation =
  | [OpType.AddComponent, string, string, Record<string, unknown>]     // [0, id, comp, allFields]
  | [OpType.UpdateComponent, string, string, Record<string, unknown>]  // [1, id, comp, partialFields]
  | [OpType.DeleteComponent, string, string]                           // [2, id, comp]
  | [OpType.UpdateSingleton, string, Record<string, unknown>]          // [3, name, partialFields]
```

**Examples:**
```typescript
[0, "abc123", "Shape", { x: 0, y: 0, width: 100 }]  // Add component (all fields)
[1, "abc123", "Shape", { x: 50, y: 100 }]           // Update component (partial)
[2, "abc123", "Shape"]                              // Delete component
[3, "Camera", { zoom: 1.5, panX: 200 }]             // Update singleton (partial)
```

**Semantics:**
- **AddComponent**: Creates new component (no-op if already exists)
- **UpdateComponent**: Updates fields on existing component (no-op if doesn't exist)
- **DeleteComponent**: Deletes component
- **UpdateSingleton**: Updates singleton fields (singletons always exist)

This prevents the delete+update concurrency bug:
- Server processes ops in order
- Update on deleted component = no-op
- No accidental resurrection from partial updates

### Server Echo Protocol

Server echoes all ops to ALL clients (including sender) with `clientId` + `timestamp`:

```
Client A                     Server                      Client B
   |                           |                            |
   |-- ops [{x:100}] --------->|                            |
   |                           | timestamp=10               |
   |<-- {ops, from:A, @10} ----|-- {ops, from:A, @10} ----->|
   |   (my own → clear pending)|   (not mine → apply)       |
   |                           |                            |
   |                           |<-- ops [{x:200}] ----------|
   |                           | timestamp=11               |
   |<-- {ops, from:B, @11} ----|-- {ops, from:B, @11} ----->|
   |   (not mine → apply)      |   (my own → clear pending) |
```

**Client logic:**
- Applies own changes immediately (optimistic)
- On broadcast: if `clientId === myId` → clear pending, don't re-apply
- On broadcast: if `clientId !== myId` → apply to local state
- Tracks `lastTimestamp` for reconnection

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Client (TypeScript)                                 │
│                                                                                  │
│  ┌────────────┐                                                                  │
│  │ ECS World  │                                                                  │
│  └─────┬──────┘                                                                  │
│        │                                                                         │
│  ┌─────▼──────┐                                                                  │
│  │Synchronizer│──────────────────────────────────────────────────────────────┐  │
│  └─────┬──────┘                                                              │  │
│        │                                                                     │  │
│  ┌─────▼──────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐  │  │
│  │ ClientSync │────►│ IndexedDB   │────►│ WebSocket   │────►│ Broadcast  │  │  │
│  │            │     │ (optional)  │     │ (optional)  │     │ Channel    │  │  │
│  │            │     │             │     │             │     │ (optional) │  │  │
│  └────────────┘     └─────────────┘     └─────────────┘     └────────────┘  │  │
│                                                │                             │  │
└────────────────────────────────────────────────┼─────────────────────────────┘  │
                                                 │                                 │
                                                 ▼                                 │
                                    ┌─────────────────────┐                       │
                                    │   Server (Go)       │◄──────────────────────┘
                                    │   - LWW Resolver    │   (same-origin tabs)
                                    │   - OpLog (1 hr)    │
                                    │   - Document (S3)   │
                                    └─────────────────────┘
```

### Optional Features

- **IndexedDB**: Persist pending ops for offline support
- **WebSocket**: Sync with remote server
- **BroadcastChannel**: Sync across same-origin tabs without server

---

## Implementation Steps

### Phase 1: Core Types

**File: `src/types.ts`**

1. Add `Operation` type (the wire format tuple)
2. Add `SyncMessage` types for client↔server protocol

```typescript
// Operation types
enum OpType {
  AddComponent = 0,
  UpdateComponent = 1,
  DeleteComponent = 2,
  UpdateSingleton = 3,
}

// Wire format operation
type Operation =
  | [OpType.AddComponent, string, string, Record<string, unknown>]
  | [OpType.UpdateComponent, string, string, Record<string, unknown>]
  | [OpType.DeleteComponent, string, string]
  | [OpType.UpdateSingleton, string, Record<string, unknown>]

// Client → Server
type ClientMessage =
  | { type: "ops"; ops: Operation[] }
  | { type: "reconnect"; lastSeq: number };

// Server → Client (echoes to ALL clients including sender)
type ServerMessage =
  | { type: "ops"; ops: Operation[]; clientId: string; timestamp: number }
  | { type: "full-sync"; state: Record<string, unknown>; timestamp: number };
```

---

### Phase 2: Diff Generation

**File: `src/diff.ts`**

Efficient diff calculation between snapshots.

```typescript
// Compare two component snapshots, return changed fields
function diffComponent(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
  id: string,
  componentName: string,
): Operation | null;

// Generate operation from ECS event
function operationFromEvent(
  eventType: "add" | "remove" | "change",
  id: string,
  componentName: string,
  prevData: Record<string, unknown> | null,
  nextData: Record<string, unknown> | null,
): Operation;
```

---

### Phase 3: Client Sync Manager

**File: `src/ClientSync.ts`**

Manages client-side sync lifecycle with optional transports/storage.

```typescript
interface ClientSyncOptions {
  clientId: string;              // Unique client identifier
  wsUrl?: string;                // WebSocket server URL (optional)
  broadcastChannel?: string;     // BroadcastChannel name (optional)
  indexedDb?: string;            // IndexedDB database name (optional)
}

class ClientSync {
  private clientId: string;
  private pendingOps: Operation[] = [];
  private lastTimestamp: number = 0;

  // Optional transports
  private ws?: WebSocket;
  private bc?: BroadcastChannel;
  private db?: IDBDatabase;

  constructor(options: ClientSyncOptions);

  // Local change → add to pending, send to server
  onLocalChange(op: Operation): void {
    this.pendingOps.push(op);
    this.ws?.send({ type: "ops", ops: [op] });
    this.bc?.postMessage({ type: "ops", ops: [op], clientId: this.clientId });
  }

  // Server broadcast received
  onServerMessage(msg: ServerMessage): void {
    if (msg.type === "ops") {
      if (msg.clientId === this.clientId) {
        // My own ops echoed back → clear pending
        this.pendingOps = [];
      } else {
        // Someone else's ops → apply to local state
        this.applyOps(msg.ops);
      }
      this.lastTimestamp = msg.timestamp;
    } else if (msg.type === "full-sync") {
      // Too far behind → reload page
      window.location.reload();
    }
  }

  // Squash pending ops into pending map (call periodically while offline)
  squashPendingOps(): void;
}
```

#### IndexedDB Storage Model (when enabled)

```typescript
// Three stores in IndexedDB:
interface SyncDB {
  // 1. Full acked state - "<id>/<component>" → value
  state: Record<string, unknown>;

  // 2. Pending ops - not yet sent or acked
  pendingOps: Operation[];

  // 3. Pending map - squashed offline changes, null = tombstone
  //    "<id>/<component>" → value | null
  pendingMap: Record<string, unknown | null>;

  // Metadata
  lastAcked: number;
}
```

**Squash flow** (periodic, while offline):

```typescript
squashPendingOps(): void {
  for (const op of this.pendingOps) {
    const key = `${op[0]}/${op[1]}`;
    if (op.length === 2) {
      // Remove: tombstone
      this.pendingMap[key] = null;
    } else if (op.length === 3) {
      // Add: full value
      this.pendingMap[key] = op[2];
    } else {
      // Change: merge fields into existing
      const existing = this.pendingMap[key] ?? this.state[key] ?? {};
      for (let i = 2; i < op.length; i += 2) {
        existing[op[i]] = op[i + 1];
      }
      this.pendingMap[key] = existing;
    }
  }
  this.pendingOps = [];
}
```

**Reconnect merge**:

1. Fetch remote state from server
2. Apply `pendingMap` on top (null = delete key)
3. Send merged diff to server
4. Clear `pendingMap` on ack

---

### Phase 4: Undo Manager

**File: `src/UndoManager.ts`**

Multiplayer-aware undo/redo following [Figma's approach](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/).

**Key principle**: Undo a lot → copy something → redo back to present = document unchanged.

```typescript
interface Checkpoint {
  forwardOps: Operation[];  // Ops that were made (for redo)
  inverseOps: Operation[];  // Inverse ops (for undo)
}

class UndoManager {
  private undoStack: Checkpoint[] = [];
  private redoStack: Checkpoint[] = [];
  private inactivityTimer: number | null = null;
  private pendingOps: Operation[] = [];  // Ops since last checkpoint

  // Called on each local change (with inverse op)
  onLocalChange(op: Operation, inverseOp: Operation): void {
    this.pendingOps.push({ forward: op, inverse: inverseOp });
    this.resetInactivityTimer();
  }

  // Create checkpoint after 1s inactivity
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.createCheckpoint(), 1000);
  }

  private createCheckpoint(): void {
    if (this.pendingOps.length === 0) return;

    this.undoStack.push({
      forwardOps: this.pendingOps.map(p => p.forward),
      inverseOps: this.pendingOps.map(p => p.inverse),
    });
    this.pendingOps = [];

    // Clear redo stack only if we made changes AFTER undoing
    // (Figma behavior: redo preserved if just copying while undone)
  }

  // Undo: apply inverse ops, move checkpoint to redo stack
  undo(): Operation[] | null {
    const checkpoint = this.undoStack.pop();
    if (!checkpoint) return null;
    this.redoStack.push(checkpoint);
    return checkpoint.inverseOps;
  }

  // Redo: apply forward ops, move checkpoint to undo stack
  redo(): Operation[] | null {
    const checkpoint = this.redoStack.pop();
    if (!checkpoint) return null;
    this.undoStack.push(checkpoint);
    return checkpoint.forwardOps;
  }

  // Remote changes arrive - no rebasing needed for ops-only approach
  // Undo/redo ops are applied on top of current state (including remote changes)
}
```

**Undo behavior**:

- Only undoes LOCAL changes (not remote collaborators')
- Remote changes are rebased into undo/redo stacks
- Checkpoints created on 1s inactivity (not every keystroke)

---

### Phase 5: Integration with Synchronizer

**File: `src/Synchronizer.ts`**

Update existing `Synchronizer` to wire up ECS ↔ ClientSync ↔ UndoManager.

```typescript
class Synchronizer {
  private clientSync: ClientSync;
  private undoManager: UndoManager;
  private documentStore: Store;
  private ephemeralStore: Store;

  // Process ECS events → sync + undo
  sync(ctx: Context): void {
    for (const event of events) {
      const op = this.eventToOperation(event);
      this.clientSync.onLocalChange(op);
      this.undoManager.onLocalChange(op);
    }
  }

  // Remote changes → ECS + rebase undo stacks
  onRemoteOps(ops: Operation[]): void {
    this.undoManager.onRemoteOps(ops);
    for (const op of ops) {
      this.operationToECS(op);
    }
  }

  // Undo → apply inverse ops to ECS
  undo(): void {
    const ops = this.undoManager.undo();
    if (ops) {
      for (const op of ops) this.operationToECS(op);
      this.clientSync.onLocalChange(...ops);
    }
  }

  // Redo → apply forward ops to ECS
  redo(): void {
    const ops = this.undoManager.redo();
    if (ops) {
      for (const op of ops) this.operationToECS(op);
      this.clientSync.onLocalChange(...ops);
    }
  }
}
```

---

## Sync Flow Diagrams

### Normal Operation (Echo Protocol)

```
Client A                     Server                      Client B
   │                           │                            │
   │-- { ops: [...] } -------->│                            │
   │                           │ assign timestamp=10        │
   │<-- { ops, from:A, @10 } --|-- { ops, from:A, @10 } --->│
   │   (my op → clear pending) │   (apply to local state)   │
   │                           │                            │
   │                           │<-- { ops: [...] } ---------|
   │                           │ assign timestamp=11        │
   │<-- { ops, from:B, @11 } --|-- { ops, from:B, @11 } --->│
   │   (apply to local state)  │   (my op → clear pending)  │
```

### Initial Connection

```
Client                          Server
  │                                │
  │──── GET /document ────────────►│
  │◄─── { state, timestamp } ─────│
  │                                │
  │──── WS connect ───────────────►│
  │                                │
  │──── { type: "ops",            │
  │       ops: [...] } ───────────►│  (pending from IndexedDB)
  │                                │
  │◄─── { type: "ops",            │
  │       ops, clientId, @seq } ──│  (echo back)
  │                                │
```

### Reconnection (< 1 hour)

```
Client                          Server
  │                                │
  │──── WS connect ───────────────►│
  │                                │
  │──── { type: "reconnect",      │
  │       lastSeq: X } ───────────►│
  │                                │
  │◄─── { type: "ops",            │  (replay from oplog)
  │       ops, clientId, @seq } ──│
  │                                │
```

### Reconnection (> 1 hour)

```
Client                          Server
  │                                │
  │──── WS connect ───────────────►│
  │                                │
  │──── { type: "reconnect",      │
  │       lastSeq: X } ───────────►│
  │                                │
  │◄─── { type: "full-sync",      │
  │       state, timestamp } ─────│
  │                                │
  │──── window.location.reload() ──│
```

---

## File Structure

```
src/
├── types.ts           # Operation, message types
├── diff.ts            # Diff generation utilities
├── ClientSync.ts      # Client sync manager (optional WS/IDB/BC)
├── UndoManager.ts     # Multiplayer undo/redo with checkpointing
├── Synchronizer.ts    # ECS ↔ Sync ↔ Undo bridge
├── Store.ts           # State container (existing)
├── Synced.ts          # Synced component (existing)
├── SyncedComponentDef.ts
├── SyncedSingletonDef.ts
└── index.ts           # Exports
```

---

## Implementation Order (Client-Side)

1. **types.ts** - Operation, ClientMessage, ServerMessage
2. **diff.ts** - Diff generation from ECS events
3. **ClientSync.ts** - Client sync manager with optional transports
4. **UndoManager.ts** - Multiplayer-aware undo/redo with checkpointing
5. **Synchronizer.ts** - Wire up ECS events ↔ ClientSync ↔ UndoManager

---

## Design Decisions

1. **Echo protocol**: Server echoes all ops to all clients (including sender) with `clientId` + `timestamp`
2. **3 op types**: Add/Remove/Change prevents delete+change concurrency bugs
3. **Storage**: IndexedDB stores full state + pending map (null = tombstone)
4. **Squashing**: Periodically squash pending ops into pending map to bound storage
5. **Encoding**: CBOR for wire format
6. **Batching**: Variable rate - 30/sec with multiple clients, 1/sec solo
7. **Server snapshots**: Every 10 min, on shutdown, after 2 min idle
8. **All transports optional**: Works offline-only, can add WS/BC/IDB progressively

---

## Server (Go - Later)

Server will be implemented in Go. Reference: `C:\Users\willw\code\crayon.town\backend\ws`

**Responsibilities:**

- LWW conflict resolution
- OpLog with 1hr TTL
- Document persistence (S3/DB)
- Broadcast to connected clients
