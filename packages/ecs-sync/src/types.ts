import { type EntityId } from "@infinitecanvas/ecs";
import type { Origin } from "./constants";

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "ephemeral" // Synced via websocket for ephemeral (cursors, selections)
  | "none"; // Not synced or stored anywhere

/**
 * Component data with existence flag.
 * _exists: true indicates the component exists (used when adding).
 * Other fields are the partial component data to merge.
 */
export type ComponentData = Record<string, unknown> & { _exists?: true };

/**
 * A patch is a map of keys to values representing component changes.
 *
 * Key format:
 * - Components: "<entityId>/<componentName>"
 * - Singletons: "<SINGLETON_ENTITY_ID>/<singletonName>"
 *
 * Value:
 * - Partial data to merge (with _exists: true for new components)
 * - null to delete the component
 *
 * Examples:
 * - Add component: { "uuid-123/Position": { _exists: true, x: 0, y: 0 } }
 * - Update component: { "uuid-123/Position": { x: 10 } }
 * - Delete component: { "uuid-123/Position": null }
 * - Update singleton: { "4294967295/Camera": { zoom: 1.5 } }
 * - Multiple changes: { "uuid-123/Position": { x: 10 }, "uuid-456/Velocity": null }
 */
export type Patch = Record<string, ComponentData | null>;

/**
 * A mutation wraps a patch with an origin tag.
 * The origin indicates which system produced the mutation,
 * allowing adapters (e.g. HistoryAdapter) to selectively
 * process mutations (e.g. only undo changes with origin 'ecs').
 */
export interface Mutation {
  patch: Patch;
  origin: Origin;
}

/**
 * Stable ID used for singleton mutation keys.
 * Singleton keys follow the format: "SINGLETON/<singletonName>"
 */
export const SINGLETON_STABLE_ID = "SINGLETON";

/**
 * Create a merge key for a component
 */
export function componentKey(
  entityId: EntityId,
  componentName: string,
): string {
  return `${entityId}/${componentName}`;
}

/**
 * Client → Server messages
 */
export type ClientMessage =
  | { type: "patch"; patches: Patch[] }
  | { type: "reconnect"; lastTimestamp: number };

/**
 * Server → Client messages (echoes to ALL clients including sender)
 */
export type ServerMessage =
  | { type: "patch"; patches: Patch[]; clientId: string; timestamp: number }
  | { type: "full-sync"; state: Record<string, unknown>; timestamp: number };
