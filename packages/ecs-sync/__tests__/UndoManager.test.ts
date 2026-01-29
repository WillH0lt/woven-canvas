import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UndoManager } from "../src/UndoManager";
import type { Patch } from "../src/types";

describe("UndoManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createManager(opts?: { inactivityTimeout?: number; maxCheckpoints?: number }) {
    return new UndoManager(opts);
  }

  describe("initial state", () => {
    it("starts with no undo/redo available", () => {
      const mgr = createManager();
      expect(mgr.canUndo()).toBe(false);
      expect(mgr.canRedo()).toBe(false);
      expect(mgr.getUndoCount()).toBe(0);
      expect(mgr.getRedoCount()).toBe(0);
    });
  });

  describe("onLocalChange", () => {
    it("makes canUndo return true before checkpoint", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      expect(mgr.canUndo()).toBe(true);
    });

    it("counts pending mutations as one undo step", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.onLocalChange({ "e1/Pos": { x: 20 } }, { "e1/Pos": { x: 10 } });
      expect(mgr.getUndoCount()).toBe(1);
    });
  });

  describe("onLocalChanges", () => {
    it("records multiple mutations at once", () => {
      const mgr = createManager();
      mgr.onLocalChanges([
        { mutation: { "e1/Pos": { x: 10 } }, inverseMutation: { "e1/Pos": { x: 0 } } },
        { mutation: { "e2/Pos": { x: 5 } }, inverseMutation: { "e2/Pos": { x: 0 } } },
      ]);
      expect(mgr.canUndo()).toBe(true);
      expect(mgr.getUndoCount()).toBe(1);
    });
  });

  describe("checkpoint via inactivity timer", () => {
    it("creates checkpoint after inactivity timeout", () => {
      const mgr = createManager({ inactivityTimeout: 500 });
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });

      // Before timeout: pending mutations count as 1 undo step
      expect(mgr.getUndoCount()).toBe(1);

      vi.advanceTimersByTime(500);

      // After timeout: checkpoint created, still 1 undo step
      expect(mgr.getUndoCount()).toBe(1);
      expect(mgr.canUndo()).toBe(true);
    });

    it("resets timer on each new change", () => {
      const mgr = createManager({ inactivityTimeout: 500 });
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });

      vi.advanceTimersByTime(400);
      mgr.onLocalChange({ "e1/Pos": { x: 20 } }, { "e1/Pos": { x: 10 } });

      vi.advanceTimersByTime(400);
      // Should NOT have checkpointed yet (timer reset)
      // Both mutations should be pending
      expect(mgr.getUndoCount()).toBe(1);

      vi.advanceTimersByTime(100);
      // Now checkpoint created
      expect(mgr.getUndoCount()).toBe(1);
    });
  });

  describe("manual checkpoint", () => {
    it("creates checkpoint immediately", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      expect(mgr.getUndoCount()).toBe(1);
    });

    it("does nothing when no pending mutations", () => {
      const mgr = createManager();
      mgr.checkpoint();
      expect(mgr.getUndoCount()).toBe(0);
    });
  });

  describe("undo", () => {
    it("returns null when nothing to undo", () => {
      const mgr = createManager();
      expect(mgr.undo()).toBe(null);
    });

    it("returns inverse mutations on undo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();

      const result = mgr.undo();
      expect(result).toEqual([{ "e1/Pos": { x: 0 } }]);
    });

    it("flushes pending mutations to checkpoint before undo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });

      // No manual checkpoint - undo should auto-flush
      const result = mgr.undo();
      expect(result).toEqual([{ "e1/Pos": { x: 0 } }]);
    });

    it("returns inverse mutations in reverse order", () => {
      const mgr = createManager();
      mgr.onLocalChange(
        { "e1/Pos": { x: 10 } },
        { "e1/Pos": { x: 0 } },
      );
      mgr.onLocalChange(
        { "e1/Pos": { y: 20 } },
        { "e1/Pos": { y: 0 } },
      );
      mgr.checkpoint();

      const result = mgr.undo();
      // Inverse mutations should be in reverse order
      expect(result).toEqual([
        { "e1/Pos": { y: 0 } },
        { "e1/Pos": { x: 0 } },
      ]);
    });

    it("enables canRedo after undo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      expect(mgr.canRedo()).toBe(true);
      expect(mgr.getRedoCount()).toBe(1);
    });

    it("disables canUndo after undoing everything", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      expect(mgr.canUndo()).toBe(false);
    });

    it("calls onApplyMutations callback", () => {
      const mgr = createManager();
      const applied: Patch[][] = [];
      mgr.onApplyMutations = (mutations) => applied.push(mutations);

      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();

      expect(applied).toEqual([[{ "e1/Pos": { x: 0 } }]]);
    });
  });

  describe("redo", () => {
    it("returns null when nothing to redo", () => {
      const mgr = createManager();
      expect(mgr.redo()).toBe(null);
    });

    it("returns forward mutations on redo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();

      const result = mgr.redo();
      expect(result).toEqual([{ "e1/Pos": { x: 10 } }]);
    });

    it("enables canUndo after redo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      mgr.redo();
      expect(mgr.canUndo()).toBe(true);
    });

    it("disables canRedo after redoing everything", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      mgr.redo();
      expect(mgr.canRedo()).toBe(false);
    });

    it("calls onApplyMutations callback", () => {
      const mgr = createManager();
      const applied: Patch[][] = [];
      mgr.onApplyMutations = (mutations) => applied.push(mutations);

      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      applied.length = 0; // clear undo callback

      mgr.redo();
      expect(applied).toEqual([[{ "e1/Pos": { x: 10 } }]]);
    });
  });

  describe("undo/redo round-trip", () => {
    it("can undo and redo multiple checkpoints", () => {
      const mgr = createManager();

      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();

      mgr.onLocalChange({ "e1/Pos": { x: 20 } }, { "e1/Pos": { x: 10 } });
      mgr.checkpoint();

      expect(mgr.getUndoCount()).toBe(2);

      // Undo twice
      expect(mgr.undo()).toEqual([{ "e1/Pos": { x: 10 } }]);
      expect(mgr.undo()).toEqual([{ "e1/Pos": { x: 0 } }]);
      expect(mgr.canUndo()).toBe(false);
      expect(mgr.getRedoCount()).toBe(2);

      // Redo twice
      expect(mgr.redo()).toEqual([{ "e1/Pos": { x: 10 } }]);
      expect(mgr.redo()).toEqual([{ "e1/Pos": { x: 20 } }]);
      expect(mgr.canRedo()).toBe(false);
    });
  });

  describe("redo stack clearing", () => {
    it("clears redo stack when new checkpoint is created", () => {
      const mgr = createManager();

      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();

      mgr.undo();
      expect(mgr.canRedo()).toBe(true);

      // New change should clear redo stack
      mgr.onLocalChange({ "e1/Pos": { x: 50 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();

      expect(mgr.canRedo()).toBe(false);
    });

    it("clearRedoStack explicitly clears redo", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.undo();
      expect(mgr.canRedo()).toBe(true);

      mgr.clearRedoStack();
      expect(mgr.canRedo()).toBe(false);
    });
  });

  describe("maxCheckpoints", () => {
    it("trims undo stack when exceeding max", () => {
      const mgr = createManager({ maxCheckpoints: 3 });

      for (let i = 0; i < 5; i++) {
        mgr.onLocalChange(
          { "e1/Pos": { x: i + 1 } },
          { "e1/Pos": { x: i } },
        );
        mgr.checkpoint();
      }

      // Should only keep the 3 most recent
      expect(mgr.getUndoCount()).toBe(3);
    });
  });

  describe("clear", () => {
    it("clears all undo/redo history", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.checkpoint();
      mgr.onLocalChange({ "e1/Pos": { x: 20 } }, { "e1/Pos": { x: 10 } });

      mgr.clear();
      expect(mgr.canUndo()).toBe(false);
      expect(mgr.canRedo()).toBe(false);
      expect(mgr.getUndoCount()).toBe(0);
      expect(mgr.getRedoCount()).toBe(0);
    });
  });

  describe("dispose", () => {
    it("clears all state and timers", () => {
      const mgr = createManager();
      mgr.onLocalChange({ "e1/Pos": { x: 10 } }, { "e1/Pos": { x: 0 } });
      mgr.dispose();

      expect(mgr.canUndo()).toBe(false);
      expect(mgr.canRedo()).toBe(false);

      // Should not create checkpoint after dispose
      vi.advanceTimersByTime(2000);
      expect(mgr.getUndoCount()).toBe(0);
    });
  });
});
