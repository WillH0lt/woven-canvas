import type { Patch } from "./types";

/**
 * A checkpoint in the undo/redo stack.
 * Contains both forward mutations (for redo) and inverse mutations (for undo).
 */
export interface Checkpoint {
  /** Mutations that were made (for redo) */
  forwardMutations: Patch[];
  /** Inverse mutations (for undo) */
  inverseMutations: Patch[];
}

/**
 * Pending mutation with its inverse for checkpoint creation
 */
interface PendingMutation {
  forward: Patch;
  inverse: Patch;
}

/**
 * Options for UndoManager
 */
export interface UndoManagerOptions {
  /** Inactivity timeout before creating a checkpoint (ms). Default: 1000 */
  inactivityTimeout?: number;
  /** Maximum number of checkpoints to keep. Default: 100 */
  maxCheckpoints?: number;
}

/**
 * Multiplayer-aware undo/redo manager following Figma's approach.
 *
 * Key principles:
 * - Only undoes LOCAL changes (not remote collaborators')
 * - Checkpoints created on inactivity (not every keystroke)
 * - Undo a lot → copy something → redo back = document unchanged
 *
 * @see https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
 */
export class UndoManager {
  private undoStack: Checkpoint[] = [];
  private redoStack: Checkpoint[] = [];
  private pendingMutations: PendingMutation[] = [];
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimeout: number;
  private maxCheckpoints: number;

  /** Callback when mutations should be applied (for undo/redo) */
  onApplyMutations: ((mutations: Patch[]) => void) | null = null;

  constructor(options: UndoManagerOptions = {}) {
    this.inactivityTimeout = options.inactivityTimeout ?? 1000;
    this.maxCheckpoints = options.maxCheckpoints ?? 100;
  }

  /**
   * Record a local change with its inverse mutation.
   * Call this for every local mutation that should be undoable.
   */
  onLocalChange(mutation: Patch, inverseMutation: Patch): void {
    this.pendingMutations.push({ forward: mutation, inverse: inverseMutation });
    this.resetInactivityTimer();
  }

  /**
   * Record multiple local changes at once.
   */
  onLocalChanges(
    mutations: Array<{ mutation: Patch; inverseMutation: Patch }>,
  ): void {
    for (const { mutation, inverseMutation } of mutations) {
      this.pendingMutations.push({
        forward: mutation,
        inverse: inverseMutation,
      });
    }
    this.resetInactivityTimer();
  }

  /**
   * Force creation of a checkpoint immediately.
   * Useful for explicit user actions like "save" or before closing.
   */
  checkpoint(): void {
    this.clearInactivityTimer();
    this.createCheckpoint();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0 || this.pendingMutations.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Undo the last checkpoint.
   * Returns the inverse mutations to apply, or null if nothing to undo.
   */
  undo(): Patch[] | null {
    // First, flush any pending mutations to a checkpoint
    if (this.pendingMutations.length > 0) {
      this.clearInactivityTimer();
      this.createCheckpoint();
    }

    const checkpoint = this.undoStack.pop();
    if (!checkpoint) return null;

    this.redoStack.push(checkpoint);

    // Apply inverse mutations and notify
    if (this.onApplyMutations) {
      this.onApplyMutations(checkpoint.inverseMutations);
    }

    return checkpoint.inverseMutations;
  }

  /**
   * Redo the last undone checkpoint.
   * Returns the forward mutations to apply, or null if nothing to redo.
   */
  redo(): Patch[] | null {
    const checkpoint = this.redoStack.pop();
    if (!checkpoint) return null;

    this.undoStack.push(checkpoint);

    // Apply forward mutations and notify
    if (this.onApplyMutations) {
      this.onApplyMutations(checkpoint.forwardMutations);
    }

    return checkpoint.forwardMutations;
  }

  /**
   * Clear the redo stack.
   * Called when new changes are made after undoing.
   *
   * Note: Following Figma's approach, we only clear redo when actual
   * modifications are made, not for read-only operations like copying.
   */
  clearRedoStack(): void {
    this.redoStack = [];
  }

  /**
   * Clear all undo/redo history.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingMutations = [];
    this.clearInactivityTimer();
  }

  /**
   * Get the number of available undo steps
   */
  getUndoCount(): number {
    return this.undoStack.length + (this.pendingMutations.length > 0 ? 1 : 0);
  }

  /**
   * Get the number of available redo steps
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Reset the inactivity timer.
   * Called on each local change to batch mutations.
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.createCheckpoint();
    }, this.inactivityTimeout);
  }

  /**
   * Clear the inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Create a checkpoint from pending mutations.
   */
  private createCheckpoint(): void {
    if (this.pendingMutations.length === 0) return;

    const checkpoint: Checkpoint = {
      forwardMutations: this.pendingMutations.map((p) => p.forward),
      // Inverse mutations are applied in reverse order
      inverseMutations: this.pendingMutations.map((p) => p.inverse).reverse(),
    };

    this.undoStack.push(checkpoint);
    this.pendingMutations = [];

    // Trim undo stack if it exceeds max size
    while (this.undoStack.length > this.maxCheckpoints) {
      this.undoStack.shift();
    }

    // Clear redo stack when new changes are checkpointed
    // (Figma behavior: redo preserved if just copying while undone,
    // but cleared when actual modifications are made)
    this.redoStack = [];
  }

  /**
   * Dispose of the undo manager and clean up timers.
   */
  dispose(): void {
    this.clearInactivityTimer();
    this.undoStack = [];
    this.redoStack = [];
    this.pendingMutations = [];
  }
}
