import type { RoomSnapshot } from "../types";

/**
 * Pluggable persistence interface for room state.
 */
export interface SyncStorage {
  /** Load the full room state. Called once when the room is created. */
  load(): Promise<RoomSnapshot | null>;

  /** Persist room state. Called whenever document state changes. */
  save(snapshot: RoomSnapshot): Promise<void>;
}
