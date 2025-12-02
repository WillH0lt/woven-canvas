import { EntityBufferView } from "./EntityBuffer";

/**
 * Context object passed to parallel system execution functions.
 * Contains the entity buffer view for querying and accessing entity data within workers.
 */
export interface Context {
  entityBuffer: EntityBufferView;
}

/**
 * Interface representing the component masks for query matching
 */
export interface QueryMasks {
  tracking: number;
  with: number;
  without: number;
  any: number;
}

/**
 * Type alias for entity identifiers
 */
export type EntityId = number;
