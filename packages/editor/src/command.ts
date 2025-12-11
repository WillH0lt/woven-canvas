import type { EditorContext } from "./types";

/**
 * A command handler defines how to execute a specific command type
 */
export interface CommandHandler<T = unknown> {
  /** Unique command type identifier */
  type: string;
  /** Execute the command */
  execute: (ctx: EditorContext, payload: T) => void;
}

/**
 * Listener callback for command events
 */
export type CommandListener = (type: string, payload: unknown) => void;

/**
 * Command registry manages command handlers and dispatches commands
 */
export interface CommandRegistry {
  /** Register a command handler */
  register<T>(handler: CommandHandler<T>): void;
  /** Emit a command to be executed */
  emit<T>(type: string, payload: T): void;
  /** Subscribe to all command emissions */
  subscribe(listener: CommandListener): () => void;
}

/**
 * Create a new command registry
 * @param getContext - Function to get the current editor context
 */
export function createCommandRegistry(
  getContext: () => EditorContext | null
): CommandRegistry {
  const handlers = new Map<string, CommandHandler>();
  const listeners: CommandListener[] = [];

  return {
    register<T>(handler: CommandHandler<T>): void {
      if (handlers.has(handler.type)) {
        console.warn(
          `Command handler for "${handler.type}" already registered, overwriting`
        );
      }
      handlers.set(handler.type, handler as CommandHandler);
    },

    emit<T>(type: string, payload: T): void {
      // Notify listeners before execution (always, even if no handler)
      for (const listener of listeners) {
        listener(type, payload);
      }

      const handler = handlers.get(type);
      if (!handler) {
        console.warn(`No handler registered for command type: ${type}`);
        return;
      }

      // Execute the command
      const context = getContext();
      if (context) {
        handler.execute(context, payload);
      } else {
        console.warn(`Cannot execute command "${type}": no context set`);
      }
    },

    subscribe(listener: CommandListener): () => void {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}

