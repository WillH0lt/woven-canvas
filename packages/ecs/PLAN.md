# Persistent Offline Buffer for WebSocket Adapter

## Problem

When a user makes changes while offline and then closes/reloads the page, the in-memory `offlineBuffer` in `WebsocketAdapter` is lost. Even though `PersistenceAdapter` saves the full state (including offline changes) to IndexedDB, those changes are never sent to the server after a page reload. This means:

- Other clients never see the offline changes
- The local client has diverged from server state (changes appear local-only)

## Solution Overview

Persist the WebSocket adapter's `offlineBuffer` and `lastTimestamp` to IndexedDB so they survive page reloads. On reconnect, send the persisted offline buffer to the server as part of the reconnect request. The server applies the patches and responds with the catch-up diff.

## Reconnect Flow (After Page Reload)

```
1. PersistenceAdapter.init()  -> loads full state from IndexedDB (includes offline changes)
2. WebsocketAdapter.init()    -> loads offlineBuffer + lastTimestamp from IndexedDB
3. PersistenceAdapter.pull()  -> emits full state as mutation
4. WebsocketAdapter connects  -> sends { type: "reconnect", lastTimestamp, patches: [offlineBuffer] }
5. Server applies patches     -> broadcasts to other clients, builds diff since lastTimestamp
6. Server responds            -> sends diff (includes our reflected patches + other clients' changes)
7. WebsocketAdapter.pull()    -> strips offlineBuffer fields from server diff (Persistence already has them)
8. Clear persisted offlineBuffer
9. Emitted diff = only the NEW changes from other clients
```

## Implementation Steps

### Step 1: Create shared IndexedDB utility

**New file: `packages/ecs-sync/src/storage.ts`**

A minimal `KeyValueStore` class wrapping `idb` for simple key-value operations. Both `PersistenceAdapter` and `WebsocketAdapter` use this instead of raw `idb` calls.

```typescript
import { openDB, type IDBPDatabase } from "idb";

export async function openStore(name: string, storeName: string): Promise<KeyValueStore> {
  const db = await openDB(name, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    },
  });
  return new KeyValueStore(db, storeName);
}

export class KeyValueStore {
  constructor(private db: IDBPDatabase, private storeName: string) {}

  async get<T>(key: string): Promise<T | undefined> { ... }
  async put(key: string, value: unknown): Promise<void> { ... }
  async delete(key: string): Promise<void> { ... }
  async getAllEntries(): Promise<[IDBValidKey, unknown][]> { ... }
  async putMany(entries: [string, unknown][]): Promise<void> { ... } // single transaction
  async clear(): Promise<void> { ... }
  close(): void { ... }
}
```

### Step 2: Refactor PersistenceAdapter to use shared utility

**File: `packages/ecs-sync/src/adapters/Persistence.ts`**

Replace direct `openDB`/transaction usage with `KeyValueStore`:

```typescript
// Before
this.db = await openDB(this.documentId, 1, { ... });
const tx = this.db.transaction(STORE_NAME, "readonly");

// After
this.store = await openStore(this.documentId, "state");
const entries = await this.store.getAllEntries();
```

Same external behavior, cleaner internals. The `persistMutations` method uses `store.put()` and `store.delete()` instead of raw transaction ops. For partial updates (merge with existing), use `store.get()` then `store.put()`.

### Step 3: Update WebsocketAdapterOptions

**File: `packages/ecs-sync/src/adapters/Websocket.ts`**

Add new options:

```typescript
export interface WebsocketAdapterOptions {
  url: string;
  clientId: string;
  startOffline?: boolean;
  documentId?: string;       // NEW: required when usePersistence is true
  usePersistence?: boolean;  // NEW: persist offline buffer to IndexedDB
}
```

### Step 4: Update WebsocketAdapter - persistence integration

**File: `packages/ecs-sync/src/adapters/Websocket.ts`**

#### 4a. Init: Load persisted offline state

```typescript
async init(): Promise<void> {
  if (this.usePersistence && this.documentId) {
    this.store = await openStore(`${this.documentId}-ws`, "meta");
    const savedBuffer = await this.store.get<Patch>("offlineBuffer");
    const savedTimestamp = await this.store.get<number>("lastTimestamp");
    if (savedBuffer) this.offlineBuffer = savedBuffer;
    if (savedTimestamp) this.lastTimestamp = savedTimestamp;
  }

  if (this.startOffline) { ... }  // existing logic
  return this.connectWs();
}
```

#### 4b. Push: Skip Persistence-origin mutations & persist offline buffer

When `usePersistence` is true, skip `Origin.Persistence` mutations in the offline buffer. Persistence-origin mutations are loaded state that the server already has (the actual unseen changes are tracked in the persisted offline buffer).

```typescript
push(mutations: Mutation[]): void {
  const patches: Patch[] = [];
  for (const m of mutations) {
    if (m.origin === Origin.Websocket) continue;
    if (this.usePersistence && m.origin === Origin.Persistence) continue;  // NEW
    patches.push(m.patch);
  }

  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    if (patches.length > 0) {
      this.offlineBuffer = merge(this.offlineBuffer, ...patches);
      this.persistOfflineBuffer();  // NEW: fire-and-forget
    }
    return;
  }
  // ... rest unchanged
}
```

#### 4c. Persist helpers (fire-and-forget)

```typescript
private persistOfflineBuffer(): void {
  if (!this.store) return;
  this.store.put("offlineBuffer", this.offlineBuffer).catch(console.error);
}

private persistTimestamp(): void {
  if (!this.store) return;
  this.store.put("lastTimestamp", this.lastTimestamp).catch(console.error);
}

private clearOfflineBuffer(): void {
  this.offlineBuffer = {};
  if (!this.store) return;
  this.store.delete("offlineBuffer").catch(console.error);
}
```

#### 4d. handleMessage: Persist lastTimestamp

```typescript
case "patch":
  this.lastTimestamp = msg.timestamp;
  this.persistTimestamp();  // NEW
  // ... rest unchanged

case "ack":
  this.lastTimestamp = msg.timestamp;
  this.persistTimestamp();  // NEW
  // ... rest unchanged
```

#### 4e. Pull: Strip offline buffer when using persistence

When `usePersistence` is true, use `strip()` instead of `merge()`. Persistence already loaded the offline changes, so we only need the NEW things from the server.

```typescript
pull(): Mutation | null {
  if (this.pendingPatches.length === 0) return null;

  const serverPatch = merge(...this.pendingPatches);
  this.pendingPatches = [];

  if (Object.keys(this.offlineBuffer).length === 0) {
    return { patch: serverPatch, origin: Origin.Websocket };
  }

  if (this.usePersistence) {
    // Persistence already loaded offline changes.
    // Strip them from server response to avoid duplicate application.
    const diff = strip(serverPatch, this.offlineBuffer);
    this.clearOfflineBuffer();
    if (Object.keys(diff).length === 0) return null;
    return { patch: diff, origin: Origin.Websocket };
  }

  // Non-persistent mode: existing behavior (merge, local wins)
  for (const key of Object.keys(this.offlineBuffer)) {
    if (serverPatch[key]?._exists === false) {
      delete this.offlineBuffer[key];
    }
  }
  const localPatch = merge(serverPatch, this.offlineBuffer);
  this.offlineBuffer = {};
  return { patch: localPatch, origin: Origin.Websocket };
}
```

#### 4f. Close: Clean up store

```typescript
close(): void {
  this.disconnect();
  if (this.store) {
    this.store.close();
    this.store = null;
  }
}
```

### Step 5: Update reconnect protocol

**File: `packages/ecs-sync/src/types.ts`**

```typescript
export interface ReconnectRequest {
  type: "reconnect";
  lastTimestamp: number;
  patches?: Patch[];  // NEW: offline buffer patches to apply
}
```

**File: `packages/ecs-sync/src/adapters/Websocket.ts`**

In `connectWs()`, include offline buffer in reconnect message:

```typescript
ws.addEventListener("open", () => {
  this.ws = ws;
  const msg: ClientMessage = {
    type: "reconnect",
    lastTimestamp: this.lastTimestamp,
  };

  // Include offline buffer patches for server to apply
  if (Object.keys(this.offlineBuffer).length > 0) {
    msg.patches = [this.offlineBuffer];
  }

  ws.send(JSON.stringify(msg));
  resolve();
});
```

### Step 6: Update server

**File: `examples/ecs-sync/server/models/messages.go`**

```go
type ReconnectRequest struct {
    Type         string  `json:"type"`
    LastTimestamp int64   `json:"lastTimestamp"`
    Patches      []Patch `json:"patches,omitempty"`  // NEW
}
```

**File: `examples/ecs-sync/server/controllers/room.go`**

Update `handleReconnect` to apply offline patches before building diff:

```go
func (r *RoomController) handleReconnect(client *socket.Client, req models.ReconnectRequest) {
    // NEW: Apply offline patches from client
    if len(req.Patches) > 0 {
        r.timestamp++
        ts := r.timestamp

        for _, patch := range req.Patches {
            r.applyPatch(patch, ts)
        }

        // Broadcast offline patches to other clients
        broadcast := models.PatchBroadcast{
            Type:      "patch",
            Patches:   req.Patches,
            ClientID:  client.ClientID,
            Timestamp: ts,
        }
        if data, err := json.Marshal(broadcast); err == nil {
            r.hub.BroadcastExcept(client, data)
        }
    }

    // Build diff since client's last known timestamp
    diff := r.buildDiff(req.LastTimestamp)
    if len(diff) == 0 {
        return
    }

    // Send catch-up diff to reconnecting client
    response := models.PatchBroadcast{
        Type:      "patch",
        Patches:   []models.Patch{diff},
        Timestamp: r.timestamp,
    }
    data, err := json.Marshal(response)
    if err != nil {
        log.Printf("Failed to marshal reconnect patch: %v", err)
        return
    }
    r.hub.SendTo(client, data)
}
```

### Step 7: Update EditorSync

**File: `packages/ecs-sync/src/EditorSync.ts`**

Pass `documentId` and `usePersistence` through to WebsocketAdapter:

```typescript
if (options.websocket) {
  this.websocketAdapter = new WebsocketAdapter({
    ...options.websocket,
    documentId: options.documentId,          // NEW
    usePersistence: options.usePersistence,  // NEW
  });
  this.adapters.push(this.websocketAdapter);
}
```

### Step 8: Update exports

**File: `packages/ecs-sync/src/index.ts`**

Export `KeyValueStore` and `openStore` if consumers might need them. Otherwise, keep them internal.

### Step 9: Tests

- **Offline buffer persistence**: Verify offlineBuffer is saved to and loaded from IndexedDB
- **lastTimestamp persistence**: Verify lastTimestamp survives reload
- **Reconnect with patches**: Verify reconnect message includes offline patches
- **Pull with strip**: Verify strip behavior when usePersistence=true (server diff minus offline buffer)
- **Persistence-origin filtering**: Verify Persistence-origin mutations are not added to offlineBuffer when usePersistence=true
- **Clear on reconnect**: Verify offlineBuffer is cleared from IndexedDB after successful reconnect
- **Non-persistent mode**: Verify existing behavior is unchanged when usePersistence=false

## Edge Cases & Considerations

1. **Server restart**: If the server loses its state and resets timestamps, `lastTimestamp` may reference a non-existent point in time. The server should handle this gracefully (e.g., send full state). This is a pre-existing concern.

2. **Offline buffer grows large**: If the user makes many changes while offline over multiple sessions, the buffer could grow large. Consider adding a size limit or compaction strategy in the future.

3. **Race between Persistence and WebSocket init**: Both adapters init in parallel via `Promise.all`. WebSocket needs its offlineBuffer loaded before the first `pull()`. Since `init()` is awaited before any `sync()` call, this is safe.

4. **Multiple tabs**: If multiple tabs are open with the same documentId, they'd share the same IndexedDB offline store. This could cause conflicts. The `-ws` suffix on the database name isolates it from the state store, but multi-tab coordination would need a separate solution (e.g., BroadcastChannel). Out of scope for now.

## Files Changed

| File | Change |
|------|--------|
| `packages/ecs-sync/src/storage.ts` | **NEW** - Shared IndexedDB key-value store utility |
| `packages/ecs-sync/src/adapters/Persistence.ts` | Refactor to use `KeyValueStore` |
| `packages/ecs-sync/src/adapters/Websocket.ts` | Add offline buffer persistence, updated reconnect, strip logic |
| `packages/ecs-sync/src/types.ts` | Add `patches` field to `ReconnectRequest` |
| `packages/ecs-sync/src/EditorSync.ts` | Pass `documentId` + `usePersistence` to WebSocket adapter |
| `examples/ecs-sync/server/models/messages.go` | Add `Patches` to `ReconnectRequest` |
| `examples/ecs-sync/server/controllers/room.go` | Handle offline patches in reconnect |
| `packages/ecs-sync/src/index.ts` | Potentially export new storage utilities |
