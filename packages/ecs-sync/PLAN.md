# Ephemeral Data Sync Implementation Plan

## Overview

Add ephemeral data sync (cursors, selections, entity-in-use indicators) alongside the existing document sync. Ephemeral data is not undoable, not persisted, and scoped per-client on the server for cleanup on disconnect.

## Decisions

- `Mutation` gains a `syncBehavior: SyncBehavior` field (`"document"` or `"ephemeral"`)
- `Adapter.pull()` returns `Mutation[]` instead of `Mutation | null`
- New `"ephemeral-patch"` wire message type (no ACKs, no timestamps)
- Server stores ephemeral data in memory namespaced by clientId
- Client doesn't see ownership — server merges all ephemeral state when sending
- On disconnect, server broadcasts deletion patches for that client's ephemeral keys
- On reconnect, client resends full ephemeral snapshot so server can restore it

---

## Step 1: Update `Mutation` type and `Adapter` interface

**File: `src/types.ts`**
- Add `syncBehavior: SyncBehavior` to `Mutation` interface

**File: `src/Adapter.ts`**
- Change `pull(): Mutation | null` to `pull(): Mutation[]`

---

## Step 2: Add new wire protocol message types

**File: `src/types.ts`**
- Add `EphemeralPatchRequest`:
  ```typescript
  interface EphemeralPatchRequest {
    type: "ephemeral-patch";
    patches: Patch[];
  }
  ```
- Add `EphemeralPatchBroadcast`:
  ```typescript
  interface EphemeralPatchBroadcast {
    type: "ephemeral-patch";
    patches: Patch[];
  }
  ```
- Add `ephemeralPatches?: Patch[]` field to `ReconnectRequest`
- Update `ClientMessage` and `ServerMessage` unions

---

## Step 3: Update `EcsAdapter`

**File: `src/adapters/ECS.ts`**

`pull()` changes:
- Return `Mutation[]` instead of `Mutation | null`
- Build two separate patches: one for document components, one for ephemeral
- During event iteration, check `componentDef.__sync` to route into the correct patch
- Return 0-2 mutations (one per non-empty patch), each tagged with the appropriate `syncBehavior`

`push()` changes:
- No changes needed — EcsAdapter applies all mutations the same way regardless of `syncBehavior`

Add `getEphemeralSnapshot(): Patch` method:
- Iterate `prevState` keys, check component name against `componentsByName` to find ephemeral components
- Return only entries whose component has `__sync === "ephemeral"`
- Add `_exists: true` flag to each entry
- Used by WebsocketAdapter to build the ephemeral payload for reconnect messages

---

## Step 4: Update `WebsocketAdapter`

**File: `src/adapters/Websocket.ts`**

`push()` changes:
- Split incoming mutations by `syncBehavior`
- Document mutations: existing behavior (buffer, throttle, send as `"patch"`)
- Ephemeral mutations: buffer into separate `ephemeralSendBuffer`, send as `"ephemeral-patch"` on same throttle cycle
- Ephemeral patches are fire-and-forget: no `inFlight` tracking, no ACK expected
- When offline: document patches go to `offlineBuffer` as before; ephemeral patches are dropped (no point buffering ephemeral data offline)

`pull()` changes:
- Return `Mutation[]` instead of `Mutation | null`
- Maintain separate `pendingEphemeralPatches` alongside existing `pendingPatches`
- Return 0-2 mutations tagged with appropriate `syncBehavior`

`flush()` changes:
- Send two separate messages if both document and ephemeral data are buffered
- Document: `{ type: "patch", messageId, patches }` (existing)
- Ephemeral: `{ type: "ephemeral-patch", patches }` (new, no messageId)

`handleMessage()` changes:
- Handle incoming `"ephemeral-patch"` messages: push patches into `pendingEphemeralPatches`
- No timestamp tracking for ephemeral messages

`connectWs()` changes:
- On reconnect, include ephemeral snapshot in the reconnect message via `getEphemeralSnapshot` callback

New constructor option:
- `getEphemeralSnapshot: () => Patch` — callback to get current ephemeral state for reconnect

---

## Step 5: Update `HistoryAdapter`

**File: `src/adapters/History.ts`**

`push()` changes:
- Filter out mutations with `syncBehavior === "ephemeral"` before processing
- Ephemeral mutations are not recorded for undo/redo and don't update history state

`pull()` changes:
- Return `Mutation[]` instead of `Mutation | null`
- Return 0-1 element array, always tagged with `syncBehavior: "document"`

---

## Step 6: Update `PersistenceAdapter`

**File: `src/adapters/Persistence.ts`**

`push()` changes:
- Filter out mutations with `syncBehavior === "ephemeral"` before persisting

`pull()` changes:
- Return `Mutation[]` instead of `Mutation | null`
- Return 0-1 element array, always tagged with `syncBehavior: "document"`

---

## Step 7: Update `EditorSync`

**File: `src/EditorSync.ts`**

`sync()` changes:
- `pull()` now returns arrays, so flatten into `allMutations`:
  ```typescript
  for (const adapter of this.adapters) {
    allMutations.push(...adapter.pull());
  }
  ```

`initialize()` changes:
- Pass `getEphemeralSnapshot` callback to WebsocketAdapter:
  ```typescript
  this.websocketAdapter = new WebsocketAdapter({
    ...this.options.websocket,
    documentId: this.options.documentId,
    usePersistence: this.options.usePersistence ?? false,
    getEphemeralSnapshot: () => this.ecsAdapter.getEphemeralSnapshot(),
  });
  ```

---

## Step 8: Update Go server — message types

**File: `server/models/messages.go`**
- Add `EphemeralPatchRequest`:
  ```go
  type EphemeralPatchRequest struct {
    Type    string  `json:"type"`
    Patches []Patch `json:"patches"`
  }
  ```
- Add `EphemeralPatchBroadcast`:
  ```go
  type EphemeralPatchBroadcast struct {
    Type    string  `json:"type"`
    Patches []Patch `json:"patches"`
  }
  ```
- Add `EphemeralPatches []Patch` field to `ReconnectRequest`

---

## Step 9: Update Go server — room controller

**File: `server/controllers/room.go`**

New state:
- `ephemeralState map[string]models.Patch` — keyed by clientId, each value is a merged Patch of that client's ephemeral data

New handler `handleEphemeralPatch()`:
- Merge incoming patches into `ephemeralState[client.ClientID]`
- Broadcast `"ephemeral-patch"` to all other clients (pass through patches)

Update `handleReconnect()`:
- Store `req.EphemeralPatches` into `ephemeralState[client.ClientID]`
- Broadcast client's ephemeral patches to others
- Merge all OTHER clients' ephemeral state into one patch, send to reconnecting client as `"ephemeral-patch"`

Update `handleConnect()`:
- Send merged ephemeral state from all existing clients to the new client as `"ephemeral-patch"`

Update `handleDisconnect()`:
- Look up `ephemeralState[client.ClientID]`
- Build deletion patch: for each key in their ephemeral data, emit `{ "_exists": false }`
- Broadcast deletion patch as `"ephemeral-patch"` to remaining clients
- Delete `ephemeralState[client.ClientID]`

Update `HandleMessage()`:
- Add `case "ephemeral-patch"` to the message type switch

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/types.ts` | Add `syncBehavior` to `Mutation`, add ephemeral message types, update `ReconnectRequest` |
| `src/Adapter.ts` | `pull()` returns `Mutation[]` |
| `src/adapters/ECS.ts` | Split pull into doc/ephemeral patches, add `getEphemeralSnapshot()` |
| `src/adapters/Websocket.ts` | Separate ephemeral send/receive, reconnect with ephemeral snapshot |
| `src/adapters/History.ts` | Skip ephemeral in push, return array from pull |
| `src/adapters/Persistence.ts` | Skip ephemeral in push, return array from pull |
| `src/EditorSync.ts` | Flatten pull arrays, pass ephemeral snapshot callback |
| `server/models/messages.go` | Add ephemeral message types, update ReconnectRequest |
| `server/controllers/room.go` | Add ephemeralState, handle ephemeral-patch, cleanup on disconnect |
