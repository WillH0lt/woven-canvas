import type { RoomSnapshot } from "../types";
import type { SyncStorage } from "./SyncStorage";

/**
 * In-memory storage. State lives only in the process.
 * Useful for development or transient rooms.
 */
export class MemoryStorage implements SyncStorage {
  private snapshot: RoomSnapshot | null = null;

  async load(): Promise<RoomSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: RoomSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }
}
