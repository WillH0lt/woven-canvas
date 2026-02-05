# Document Version Staleness Detection

## Overview

Add two version numbers to detect stale local data and protocol incompatibilities:

- **`dataVersion`**: Bumped when the server-side data schema changes (migrations). Defaults to `1`. Specified by the library user in `EditorSyncOptions`.
- **`protocolVersion`**: Bumped when the wire protocol between client and server changes. Hardcoded as a constant inside `ecs-sync` (not user-facing).

Both are sent on reconnect. They trigger different behaviors on mismatch:

- **`dataVersion` mismatch**: Local data is stale. Dump IndexedDB state and offline buffer, reload from server.
- **`protocolVersion` mismatch**: Client can't talk to server, but local data is still valid. Set `needsRefresh` flag so the app can prompt the user to refresh. Don't touch local data.

Migrations are performed manually on the server by the library user.

## Flow

1. Library user specifies `dataVersion` in `EditorSyncOptions` (default `1`). `protocolVersion` is a hardcoded constant in the library.
2. `PersistenceAdapter` stores `dataVersion` locally. `WebsocketAdapter` stores both versions locally.
3. On init, each adapter compares stored versions with code versions:
   - `dataVersion` differs → clear local data (IndexedDB state, offline buffer, timestamp)
   - `protocolVersion` differs → no data clearing (data is still valid)
4. On reconnect, the client sends both versions to the server
5. If the server detects a mismatch on either, it responds with a `version-mismatch` message
6. The client sets `needsRefresh = true` and fires `onVersionMismatch` so the app can prompt the user to refresh

## Deployment sequence

1. Take server offline
2. Run migration scripts on server data
3. Bump document version in server metadata
4. Deploy new client code with matching `dataVersion`
5. Server comes back online
6. Clients reconnect, detect local version != code version, dump local data, reload from server

---

## Step 1: Add versions to wire protocol

**File: `src/constants.ts`**

Add hardcoded protocol version:

```typescript
export const PROTOCOL_VERSION = 1;
```

**File: `src/types.ts`**

Add versions to `ReconnectRequest`:

```typescript
export interface ReconnectRequest {
  type: "reconnect";
  lastTimestamp: number;
  dataVersion: number;
  protocolVersion: number;
  documentPatches?: Patch[];
  ephemeralPatches?: Patch[];
}
```

Add `VersionMismatchResponse`:

```typescript
export interface VersionMismatchResponse {
  type: "version-mismatch";
  serverDataVersion: number;
  serverProtocolVersion: number;
}
```

Update `ServerMessage` union:

```typescript
export type ServerMessage =
  | AckResponse
  | PatchBroadcast
  | ClientCountBroadcast
  | VersionMismatchResponse;
```

---

## Step 2: Update PersistenceAdapter

**File: `src/adapters/Persistence.ts`**

- Add `dataVersion: number` to `PersistenceAdapterOptions` (default `1`)
- On `init()`:
  - Read stored `__dataVersion` from the state store
  - If stored version exists and differs from code version, call `this.store.clear()`
  - Save code `dataVersion` to `__dataVersion`
- In `loadState()`:
  - Skip keys starting with `__` when building the merge patch
- Add `clearAll()` method:
  - Clears the store and resets `pendingPatch`

---

## Step 3: Update WebsocketAdapter

**File: `src/adapters/Websocket.ts`**

- Add `dataVersion: number` to `WebsocketAdapterOptions` (default `1`)
- Import `PROTOCOL_VERSION` from constants
- On `init()`:
  - Read stored `dataVersion` from meta store
  - If stored `dataVersion` exists and differs from code version, clear `offlineBuffer`, `lastTimestamp`, and persisted metadata (stale data)
  - Save code `dataVersion` to meta store
- In `connectWs()`:
  - Include `dataVersion` and `PROTOCOL_VERSION` in the reconnect message
- In `handleMessage()`:
  - Handle `"version-mismatch"` message type
  - Set `this._needsRefresh = true`
  - Call `onVersionMismatch` callback
- Add `clearLocalData()` method:
  - Clears offline buffer, timestamp, and persisted metadata
- Add `needsRefresh` getter
- Add `onVersionMismatch` callback to options

---

## Step 4: Update EditorSync

**File: `src/EditorSync.ts`**

- Add `dataVersion?: number` (default `1`) to `EditorSyncOptions`
- Add `onVersionMismatch` callback to `EditorSyncOptions`
- Pass versions through to both `PersistenceAdapter` and `WebsocketAdapter`
- Expose `needsRefresh` getter (delegates to `WebsocketAdapter`)
- Add `clearLocalData()` method that clears both adapters

---

## Step 5: Update exports

**File: `src/index.ts`**

- Export `VersionMismatchResponse` type from `types.ts`

---

## File Change Summary

| File                          | Changes                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/constants.ts`            | Add `PROTOCOL_VERSION` constant                                                                              |
| `src/types.ts`                | Add `dataVersion`/`protocolVersion` to `ReconnectRequest`, add `VersionMismatchResponse`, update `ServerMessage` |
| `src/adapters/Persistence.ts` | `dataVersion`-aware init, clear on data mismatch, skip `__`-prefixed keys in loadState                     |
| `src/adapters/Websocket.ts`   | Send versions on reconnect, clear offline data on data mismatch, handle `version-mismatch`, `needsRefresh` |
| `src/EditorSync.ts`           | Accept and pass `dataVersion`, expose `needsRefresh`, `clearLocalData()`, `onVersionMismatch`              |
| `src/index.ts`                | Export `VersionMismatchResponse`                                                                           |
