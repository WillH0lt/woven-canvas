import {
  defineComponent,
  field,
  defineQuery,
  createEntity,
  addComponent,
  removeEntity,
  type EntityId,
  type Context,
} from "@infinitecanvas/ecs";

/**
 * Marker component for all command entities.
 * Commands are ephemeral entities that exist for exactly one frame.
 */
export const CommandMarker = defineComponent({
  typeId: field.uint32(),
});

/** Store payloads outside ECS - keyed by entity ID */
const commandPayloads = new Map<EntityId, unknown>();

/** Auto-incrementing type ID */
let nextTypeId = 0;

// Query for commands - we filter by typeId in iter()
const commands = defineQuery((q) => q.with(CommandMarker));

/**
 * Command definition - provides typed spawn() and iteration.
 *
 * @typeParam T - The payload type for this command
 */
export interface CommandDef<T> {
  /** Unique numeric identifier for this command type */
  readonly typeId: number;

  /** Human-readable command name */
  readonly name: string;

  /**
   * Spawn a command entity with the given payload.
   * The command will be available to systems this frame and cleaned up at frame end.
   *
   * @param ctx - Editor context
   * @param payload - Command payload data
   * @returns Entity ID of the spawned command
   */
  spawn(ctx: Context, payload: T): EntityId;

  /**
   * Iterate over commands of this type spawned this frame.
   * Use this in systems to react to commands.
   *
   * @param ctx - Editor context
   * @returns Iterable of command entities with their payloads
   */
  iter(ctx: Context): IterableIterator<{ eid: EntityId; payload: T }>;
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
 * DefineEditorSystem("update", (ctx) => {
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
  const typeId = nextTypeId++;

  return {
    typeId,
    name,

    spawn(ctx: Context, payload: T): EntityId {
      const eid = createEntity(ctx);
      addComponent(ctx, eid, CommandMarker, { typeId });
      commandPayloads.set(eid, payload);
      return eid;
    },

    *iter(ctx: Context): IterableIterator<{ eid: EntityId; payload: T }> {
      for (const eid of commands.current(ctx)) {
        const marker = CommandMarker.read(ctx, eid);
        if (marker.typeId === typeId) {
          const payload = commandPayloads.get(eid) as T;
          yield { eid, payload };
        }
      }
    },
  };
}

/**
 * Clean up all command entities and their payloads.
 * Called automatically at the end of each frame.
 *
 * @internal
 */
export function cleanupCommands(ctx: Context): void {
  for (const eid of commands.current(ctx)) {
    commandPayloads.delete(eid);
    removeEntity(ctx, eid);
  }
}
