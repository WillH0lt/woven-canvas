import {
  addComponent,
  type Context,
  createEntity,
  defineComponent,
  defineQuery,
  type EntityId,
  field,
  getResources,
  removeEntity,
} from '@woven-ecs/core'
import type { Editor } from './Editor'
import type { EditorResources } from './types'

/**
 * Marker component for all command entities.
 * Commands are ephemeral entities that exist for exactly one frame.
 */
export const CommandMarker = defineComponent({
  name: field.string().max(128),
})

/**
 * Per-editor command payload storage.
 * Uses WeakMap keyed by Editor instance for world isolation and automatic cleanup.
 */
const editorPayloads = new WeakMap<Editor, Map<EntityId, unknown>>()

/** Get or create the payload map for an editor */
function getPayloadMap(ctx: Context): Map<EntityId, unknown> {
  const { editor } = getResources<EditorResources>(ctx)
  let map = editorPayloads.get(editor)
  if (!map) {
    map = new Map()
    editorPayloads.set(editor, map)
  }
  return map
}

// Query for commands - we filter by name in iter()
const commands = defineQuery((q) => q.with(CommandMarker))

/**
 * Command definition - provides typed spawn() and iteration.
 *
 * @typeParam T - The payload type for this command
 */
export interface CommandDef<T> {
  /** Unique command name */
  readonly name: string

  /**
   * Spawn a command entity with the given payload.
   * The command will be available to systems this frame and cleaned up at frame end.
   *
   * @param ctx - Editor context
   * @param payload - Command payload data
   * @returns Entity ID of the spawned command
   */
  spawn(ctx: Context, payload: T): EntityId

  /**
   * Iterate over commands of this type spawned this frame.
   * Use this in systems to react to commands.
   *
   * @param ctx - Editor context
   * @returns Iterable of command entities with their payloads
   */
  iter(ctx: Context): IterableIterator<{ eid: EntityId; payload: T }>

  /**
   * Check if this command was spawned in the previous frame.
   * Useful for testing - checks the removed query for commands cleaned up last frame.
   *
   * @param ctx - Editor context
   * @returns True if at least one command of this type was spawned last frame
   */
  didSpawnLastFrame(ctx: Context): boolean
}

/**
 * Define a command type with a typed payload.
 *
 * Commands are ephemeral entities that exist for exactly one frame.
 * External code spawns commands via `editor.command()`, and systems
 * react to them by iterating with `CommandDef.iter()`.
 *
 * @typeParam T - The payload type (use `void` for commands with no data)
 * @param name - Human-readable command name for debugging
 * @returns A CommandDef for spawning and iterating commands
 *
 * @example
 * ```typescript
 * // Define commands with typed payloads
 * const SelectAll = defineCommand<{ filter?: string }>("select-all");
 * const Undo = defineCommand<void>("undo");
 *
 * // Spawn from external code
 * editor.command(SelectAll, { filter: "blocks" });
 * editor.command(Undo);
 *
 * // React in a system
 * defineSystem("update", (ctx) => {
 *   for (const { payload } of SelectAll.iter(ctx)) {
 *     selectAllBlocks(ctx, payload.filter);
 *   }
 *
 *   for (const _ of Undo.iter(ctx)) {
 *     performUndo(ctx);
 *   }
 * });
 * ```
 */
export function defineCommand<T = void>(name: string): CommandDef<T> {
  return {
    name,

    spawn(ctx: Context, payload: T): EntityId {
      const eid = createEntity(ctx)
      addComponent(ctx, eid, CommandMarker, { name })
      getPayloadMap(ctx).set(eid, payload)

      // console.log(
      //   `Spawned command "${name}" with eid ${eid} and payload:`,
      //   payload,
      // );
      return eid
    },

    *iter(ctx: Context): IterableIterator<{ eid: EntityId; payload: T }> {
      const payloads = getPayloadMap(ctx)
      for (const eid of commands.current(ctx)) {
        const marker = CommandMarker.read(ctx, eid)
        if (marker.name === name) {
          const payload = payloads.get(eid) as T
          yield { eid, payload }
        }
      }
    },

    didSpawnLastFrame(ctx: Context): boolean {
      for (const eid of commands.removed(ctx)) {
        const marker = CommandMarker.read(ctx, eid)
        if (marker.name === name) {
          return true
        }
      }
      return false
    },
  }
}

/**
 * Clean up all command entities and their payloads.
 * Called automatically at the end of each frame.
 *
 * @internal
 */
export function cleanupCommands(ctx: Context): void {
  const payloads = getPayloadMap(ctx)
  for (const eid of commands.current(ctx)) {
    payloads.delete(eid)
    removeEntity(ctx, eid)
  }
}

/**
 * Execute a handler for each command of a given type spawned this frame.
 *
 * This is a convenience helper that iterates over commands and calls
 * the handler for each one. Use this to reduce boilerplate in systems.
 *
 * @param ctx - Editor context
 * @param def - The command definition to listen for
 * @param handler - Function to call for each command
 *
 * @example
 * ```typescript
 * defineSystem((ctx) => {
 *   on(ctx, SelectAll, (ctx, payload) => {
 *     selectAllBlocks(ctx, payload.filter);
 *   });
 *
 *   on(ctx, Undo, (ctx) => {
 *     performUndo(ctx);
 *   });
 * });
 * ```
 */
export function on<T>(ctx: Context, def: CommandDef<T>, handler: (ctx: Context, payload: T) => void): void {
  for (const { payload } of def.iter(ctx)) {
    handler(ctx, payload)
  }
}

/**
 * Undo command - triggers an undo operation on the store.
 * Only executes if the store supports undo and canUndo() returns true.
 */
export const Undo = defineCommand<void>('undo')

/**
 * Redo command - triggers a redo operation on the store.
 * Only executes if the store supports redo and canRedo() returns true.
 */
export const Redo = defineCommand<void>('redo')
