import type { ComponentDef } from "./Component";
import type { ComponentSchema, InferComponentType } from "./Component/types";
import type { EntityId } from "./types";

/**
 * Command types for deferred operations
 */
export enum CommandType {
  REMOVE_ENTITY = 0,
  ADD_COMPONENT = 1,
  REMOVE_COMPONENT = 2,
}

/**
 * Base command interface
 */
interface BaseCommand {
  type: CommandType;
  entityId: EntityId;
}

/**
 * Command to remove an entity
 */
interface RemoveEntityCommand extends BaseCommand {
  type: CommandType.REMOVE_ENTITY;
}

/**
 * Command to add a component to an entity
 */
interface AddComponentCommand<T extends ComponentSchema = any>
  extends BaseCommand {
  type: CommandType.ADD_COMPONENT;
  componentDef: ComponentDef<T>;
  data: Partial<InferComponentType<T>>;
}

/**
 * Command to remove a component from an entity
 */
interface RemoveComponentCommand<T extends ComponentSchema = any>
  extends BaseCommand {
  type: CommandType.REMOVE_COMPONENT;
  componentDef: ComponentDef<T>;
}

/**
 * Union type for all commands
 */
export type Command =
  | RemoveEntityCommand
  | AddComponentCommand
  | RemoveComponentCommand;

/**
 * CommandBuffer stores deferred entity/component operations to be executed
 * at a safe point in the frame (during world.sync()).
 *
 * This allows code outside of system execution to queue changes that will
 * be applied predictably at the start of the next frame, avoiding race
 * conditions and unpredictable behavior.
 *
 * @example
 * ```typescript
 * // Outside of a system, queue a change
 * removeEntity(ctx, entityId); // This is deferred
 *
 * // Later, in the game loop:
 * world.sync(); // Commands are flushed here
 * ```
 */
export class CommandBuffer {
  private commands: Command[] = [];

  /**
   * Queue a remove entity command
   * @param entityId - The entity to remove
   */
  removeEntity(entityId: EntityId): void {
    this.commands.push({
      type: CommandType.REMOVE_ENTITY,
      entityId,
    });
  }

  /**
   * Queue an add component command
   * @param entityId - The entity to add the component to
   * @param componentDef - The component definition
   * @param data - Initial data for the component
   */
  addComponent<T extends ComponentSchema>(
    entityId: EntityId,
    componentDef: ComponentDef<T>,
    data: Partial<InferComponentType<T>> = {} as any
  ): void {
    this.commands.push({
      type: CommandType.ADD_COMPONENT,
      entityId,
      componentDef,
      data,
    });
  }

  /**
   * Queue a remove component command
   * @param entityId - The entity to remove the component from
   * @param componentDef - The component definition
   */
  removeComponent<T extends ComponentSchema>(
    entityId: EntityId,
    componentDef: ComponentDef<T>
  ): void {
    this.commands.push({
      type: CommandType.REMOVE_COMPONENT,
      entityId,
      componentDef,
    });
  }

  /**
   * Get all pending commands and clear the buffer
   * @returns Array of pending commands
   */
  flush(): Command[] {
    const commands = this.commands;
    this.commands = [];
    return commands;
  }
}
