import type { Adapter } from "../Adapter";
import type { Mutation, Patch, ComponentData } from "../types";
import { merge } from "../mutations";
import { Origin } from "../constants";

interface Checkpoint {
  forward: Patch[];
  inverse: Patch[];
}

export interface HistoryAdapterOptions {
  /** Inactivity timeout before creating a checkpoint (ms). Default: 1000 */
  inactivityTimeout?: number;
  /** Maximum number of checkpoints to keep. Default: 100 */
  maxCheckpoints?: number;
}

/**
 * Undo/redo adapter that creates checkpoints based on inactivity.
 *
 * Tracks document state by observing mutations via push() and computes
 * minimal inverse mutations for each change. After 1 second of inactivity,
 * bundles accumulated forward/inverse mutations into a checkpoint.
 *
 * Only tracks mutations with origin 'ecs' (user actions).
 * Undo applies the inverse mutations; redo re-applies the forward mutations.
 */
export class HistoryAdapter implements Adapter {
  /** Current state, used to compute inverse mutations */
  private state: Record<string, ComponentData> = {};
  private undoStack: Checkpoint[] = [];
  private redoStack: Checkpoint[] = [];
  private pendingForward: Patch[] = [];
  private pendingInverse: Patch[] = [];
  private pendingPullPatches: Patch[] = [];
  private dirty = false;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimeout: number;
  private maxCheckpoints: number;

  constructor(options: HistoryAdapterOptions = {}) {
    this.inactivityTimeout = options.inactivityTimeout ?? 1000;
    this.maxCheckpoints = options.maxCheckpoints ?? 100;
  }

  async init(): Promise<void> {}

  push(mutations: Mutation[]): void {
    if (mutations.length === 0) return;

    // Apply every mutation in the order received so that all adapters
    // converge to the same state.  Only ECS-originated mutations are
    // recorded for undo/redo; everything else (including our own
    // History-origin output from undo/redo) just updates state.
    for (const m of mutations) {
      if (m.origin === Origin.ECS) {
        if (Object.keys(m.patch).length === 0) continue;

        const inverse = this.applyAndComputeInverse(m.patch);
        this.pendingForward.push(m.patch);
        this.pendingInverse.push(inverse);
        this.dirty = true;
        this.resetInactivityTimer();
        this.redoStack = [];
      } else {
        // History, Websocket, Persistence — apply to state only
        this.applyToState(m.patch);
      }
    }
  }

  pull(): Mutation | null {
    if (this.pendingPullPatches.length === 0) return null;
    const patch = merge(...this.pendingPullPatches);
    this.pendingPullPatches = [];
    return { patch, origin: Origin.History };
  }

  undo(): boolean {
    if (this.dirty) {
      this.createCheckpoint();
    }

    if (this.undoStack.length === 0) return false;

    const checkpoint = this.undoStack.pop()!;

    // Apply inverse patches via applyAndComputeInverse so we capture the
    // current state of every touched key *before* the undo.  These captured
    // values become the redo entry's forward patches — ensuring that redo
    // restores the exact pre-undo state (including any remote changes).
    const recomputedForward: Patch[] = [];
    for (const patch of checkpoint.inverse) {
      const inversePatch = this.applyAndComputeInverse(patch);
      recomputedForward.push(inversePatch);
    }

    // recomputedForward is in inverse-application order (reverse of creation
    // order).  Reverse it so redo re-applies in the natural forward order.
    this.redoStack.push({
      forward: [...recomputedForward].reverse(),
      inverse: checkpoint.inverse,
    });

    this.pendingPullPatches.push(...checkpoint.inverse);

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const checkpoint = this.redoStack.pop()!;

    // Apply forward patches via applyAndComputeInverse so we capture the
    // current state of every touched key *before* the redo.  These captured
    // values become the undo entry's inverse patches — ensuring that a
    // subsequent undo restores the exact pre-redo state.
    const recomputedInverse: Patch[] = [];
    for (const patch of checkpoint.forward) {
      const inversePatch = this.applyAndComputeInverse(patch);
      recomputedInverse.push(inversePatch);
    }

    this.undoStack.push({
      forward: checkpoint.forward,
      inverse: [...recomputedInverse].reverse(),
    });

    this.pendingPullPatches.push(...checkpoint.forward);

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 || this.dirty;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  close(): void {
    this.clearInactivityTimer();
  }

  private createCheckpoint(): void {
    if (!this.dirty) return;

    this.clearInactivityTimer();
    this.undoStack.push({
      forward: this.pendingForward,
      inverse: [...this.pendingInverse].reverse(),
    });
    this.pendingForward = [];
    this.pendingInverse = [];
    this.dirty = false;

    while (this.undoStack.length > this.maxCheckpoints) {
      this.undoStack.shift();
    }
  }

  /**
   * Apply a diff to state and return the inverse diff.
   */
  private applyAndComputeInverse(diff: Patch): Patch {
    const inverse: Patch = {};

    for (const [key, value] of Object.entries(diff)) {
      const prev = this.state[key];

      if (value._exists === false) {
        // Deletion: inverse restores previous value
        if (prev !== undefined && prev._exists !== false) {
          inverse[key] = { _exists: true, ...prev };
        }
        this.state[key] = { _exists: false };
      } else if (value._exists) {
        // Addition/replacement: inverse is deletion or restore previous
        if (prev === undefined || prev._exists === false) {
          inverse[key] = { _exists: false };
        } else {
          inverse[key] = { _exists: true, ...prev };
        }
        const { _exists, ...data } = value;
        this.state[key] = data as ComponentData;
      } else {
        // Partial update: inverse contains previous values of changed fields
        const inverseChanges: ComponentData = {};
        for (const field of Object.keys(value)) {
          if (prev !== undefined && prev._exists !== false && field in prev) {
            inverseChanges[field] = prev[field];
          }
        }
        if (Object.keys(inverseChanges).length > 0) {
          inverse[key] = inverseChanges;
        }
        const base = prev?._exists === false ? {} : prev;
        this.state[key] = { ...base, ...value };
      }
    }

    return inverse;
  }

  /**
   * Apply a diff to state without computing an inverse.
   * Used during undo/redo to keep state in sync.
   */
  private applyToState(diff: Patch): void {
    for (const [key, value] of Object.entries(diff)) {
      if (value._exists === false) {
        this.state[key] = { _exists: false };
      } else if (value._exists) {
        const { _exists, ...data } = value;
        this.state[key] = data as ComponentData;
      } else {
        const existing = this.state[key];
        const base = existing?._exists === false ? {} : existing;
        this.state[key] = { ...base, ...value };
      }
    }
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.createCheckpoint();
    }, this.inactivityTimeout);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
