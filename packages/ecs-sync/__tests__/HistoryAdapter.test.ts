import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HistoryAdapter } from "../src/adapters/History";
import { Origin } from "../src/constants";
import type { Mutation } from "../src/types";

describe("HistoryAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createAdapter(opts?: { inactivityTimeout?: number; maxCheckpoints?: number }) {
    return new HistoryAdapter(opts);
  }

  function ecsMutation(patch: Mutation["patch"]): Mutation {
    return { patch, origin: Origin.ECS, syncBehavior: "document" };
  }

  function wsMutation(patch: Mutation["patch"]): Mutation {
    return { patch, origin: Origin.Websocket, syncBehavior: "document" };
  }

  describe("init", () => {
    it("resolves immediately", async () => {
      const adapter = createAdapter();
      await expect(adapter.init()).resolves.toBeUndefined();
    });
  });

  describe("push", () => {
    it("does nothing with empty mutations", () => {
      const adapter = createAdapter();
      adapter.push([]);
      expect(adapter.canUndo()).toBe(false);
    });

    it("only tracks ECS-originated mutations", () => {
      const adapter = createAdapter();
      adapter.push([wsMutation({ "e1/Pos": { x: 10 } })]);
      expect(adapter.canUndo()).toBe(false);
    });

    it("tracks ECS mutations for undo", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      expect(adapter.canUndo()).toBe(true);
    });

    it("clears redo stack on new push", () => {
      const adapter = createAdapter();

      // Create some undo history
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);

      adapter.undo();
      expect(adapter.canRedo()).toBe(true);

      // New mutation should clear redo
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 50 } })]);
      expect(adapter.canRedo()).toBe(false);
    });
  });

  describe("pull", () => {
    it("returns empty array when no pending mutations", () => {
      const adapter = createAdapter();
      expect(adapter.pull()).toEqual([]);
    });

    it("returns pending mutation from undo and clears it", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);

      adapter.undo();
      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      expect(mutation[0].origin).toBe(Origin.History);

      // Second pull should be empty array
      expect(adapter.pull()).toEqual([]);
    });
  });

  describe("undo/redo with state tracking", () => {
    it("undoes an addition (inverse is deletion)", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      vi.advanceTimersByTime(1000);

      const undid = adapter.undo();
      expect(undid).toBe(true);

      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      // Inverse of adding should be deletion
      expect(mutation[0].patch["e1/Pos"]).toEqual({ _exists: false });
    });

    it("undoes a deletion (inverse is restoration)", () => {
      const adapter = createAdapter();

      // First add component
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      vi.advanceTimersByTime(1000);

      // Then delete it
      adapter.push([ecsMutation({ "e1/Pos": { _exists: false } })]);
      vi.advanceTimersByTime(1000);

      const undid = adapter.undo();
      expect(undid).toBe(true);

      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      // Inverse of deletion should restore the component with _exists
      expect(mutation[0].patch["e1/Pos"]).toEqual({
        _exists: true,
        x: 10,
        y: 20,
      });
    });

    it("undoes a partial update (inverse restores previous values)", () => {
      const adapter = createAdapter();

      // Add component
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      vi.advanceTimersByTime(1000);

      // Partially update
      adapter.push([ecsMutation({ "e1/Pos": { x: 50 } })]);
      vi.advanceTimersByTime(1000);

      const undid = adapter.undo();
      expect(undid).toBe(true);

      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      // Inverse should restore x to its previous value
      expect(mutation[0].patch["e1/Pos"]).toEqual({ x: 10 });
    });

    it("redo re-applies forward mutations", () => {
      const adapter = createAdapter();

      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      vi.advanceTimersByTime(1000);

      adapter.push([ecsMutation({ "e1/Pos": { x: 50 } })]);
      vi.advanceTimersByTime(1000);

      adapter.undo();
      adapter.pull(); // consume undo mutation

      const redone = adapter.redo();
      expect(redone).toBe(true);

      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      // Redo should re-apply the forward mutation
      expect(mutation[0].patch["e1/Pos"]).toEqual({ x: 50 });
    });
  });

  describe("undo returns false when empty", () => {
    it("returns false when no history", () => {
      const adapter = createAdapter();
      expect(adapter.undo()).toBe(false);
    });

    it("returns false after undoing everything", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);

      adapter.undo();
      expect(adapter.undo()).toBe(false);
    });
  });

  describe("redo returns false when empty", () => {
    it("returns false when no redo history", () => {
      const adapter = createAdapter();
      expect(adapter.redo()).toBe(false);
    });
  });

  describe("checkpoint creation", () => {
    it("batches mutations within inactivity timeout", () => {
      const adapter = createAdapter({ inactivityTimeout: 500 });

      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10, y: 20 } })]);
      vi.advanceTimersByTime(200);

      adapter.push([ecsMutation({ "e1/Pos": { x: 50 } })]);
      vi.advanceTimersByTime(500);

      // Both mutations should be in one checkpoint
      adapter.undo();
      const mutation = adapter.pull();
      // Should undo both (merged into a single mutation)
      expect(mutation).toHaveLength(1);
    });

    it("flushes pending on undo if dirty", () => {
      const adapter = createAdapter();

      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      // Don't wait for timeout - undo should flush

      const undid = adapter.undo();
      expect(undid).toBe(true);
    });
  });

  describe("maxCheckpoints", () => {
    it("trims undo stack when exceeding max", () => {
      const adapter = createAdapter({ maxCheckpoints: 2 });

      for (let i = 0; i < 5; i++) {
        adapter.push([
          ecsMutation({ "e1/Pos": { _exists: true, x: i } }),
        ]);
        vi.advanceTimersByTime(1000);
      }

      // Should only be able to undo 2 times
      expect(adapter.undo()).toBe(true);
      expect(adapter.undo()).toBe(true);
      expect(adapter.undo()).toBe(false);
    });
  });

  describe("canUndo / canRedo", () => {
    it("canUndo is true when dirty (pending mutations)", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      expect(adapter.canUndo()).toBe(true);
    });

    it("canUndo is true with undo stack", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);
      expect(adapter.canUndo()).toBe(true);
    });

    it("canRedo is true after undo", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);
      adapter.undo();
      expect(adapter.canRedo()).toBe(true);
    });

    it("canRedo is false with no redo stack", () => {
      const adapter = createAdapter();
      expect(adapter.canRedo()).toBe(false);
    });
  });

  describe("close", () => {
    it("clears inactivity timer", () => {
      const adapter = createAdapter();
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      adapter.close();
      // Should not throw or create checkpoints after close
      vi.advanceTimersByTime(2000);
    });
  });

  describe("undo/redo with remote changes (Figma principle)", () => {
    it("undo then redo is a no-op when remote changes occurred", () => {
      const adapter = createAdapter();

      // User changes x: 0 → 10
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 0 } })]);
      vi.advanceTimersByTime(1000);
      adapter.push([ecsMutation({ "e1/Pos": { x: 10 } })]);
      vi.advanceTimersByTime(1000);

      // Remote changes x to 50
      adapter.push([wsMutation({ "e1/Pos": { x: 50 } })]);

      // Undo the user's last change
      adapter.undo();
      const undoMut = adapter.pull()[0];
      // Inverse restores x to 0 (pre-user-change value)
      expect(undoMut.patch["e1/Pos"]).toEqual({ x: 0 });

      // Push the undo result back through (simulating the sync loop)
      adapter.push([{ patch: undoMut.patch, origin: Origin.History, syncBehavior: "document" }]);

      // Redo — should restore x to 50 (the pre-undo state), NOT x to 10
      adapter.redo();
      const redoMut = adapter.pull()[0];
      expect(redoMut.patch["e1/Pos"]).toEqual({ x: 50 });
    });

    it("multiple undo then multiple redo restores original state with remote changes", () => {
      const adapter = createAdapter();

      // User creates entity
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 0, y: 0 } })]);
      vi.advanceTimersByTime(1000);

      // User changes x
      adapter.push([ecsMutation({ "e1/Pos": { x: 10 } })]);
      vi.advanceTimersByTime(1000);

      // User changes y
      adapter.push([ecsMutation({ "e1/Pos": { y: 20 } })]);
      vi.advanceTimersByTime(1000);

      // Remote changes x to 99
      adapter.push([wsMutation({ "e1/Pos": { x: 99 } })]);

      // State is now: x=99, y=20

      // Undo y change
      adapter.undo();
      const undo1 = adapter.pull()[0];
      adapter.push([{ patch: undo1.patch, origin: Origin.History, syncBehavior: "document" }]);

      // Undo x change
      adapter.undo();
      const undo2 = adapter.pull()[0];
      adapter.push([{ patch: undo2.patch, origin: Origin.History, syncBehavior: "document" }]);

      // Redo x change — should restore x to 99 (pre-first-undo), not 10
      adapter.redo();
      const redo1 = adapter.pull()[0];
      adapter.push([{ patch: redo1.patch, origin: Origin.History, syncBehavior: "document" }]);
      expect(redo1.patch["e1/Pos"]).toEqual({ x: 99 });

      // Redo y change — should restore y to 20
      adapter.redo();
      const redo2 = adapter.pull()[0];
      expect(redo2.patch["e1/Pos"]).toEqual({ y: 20 });
    });

    it("redo after remote change on same key preserves pre-undo state", () => {
      const adapter = createAdapter();

      // User adds entity with x=10
      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 10 } })]);
      vi.advanceTimersByTime(1000);

      // Remote changes x to 50
      adapter.push([wsMutation({ "e1/Pos": { x: 50 } })]);

      // Undo creation — deletes entity
      adapter.undo();
      const undoMut = adapter.pull()[0];
      expect(undoMut.patch["e1/Pos"]).toEqual({ _exists: false });
      adapter.push([{ patch: undoMut.patch, origin: Origin.History, syncBehavior: "document" }]);

      // Redo — should restore entity with x=50 (remote value was present)
      adapter.redo();
      const redoMut = adapter.pull()[0];
      expect(redoMut.patch["e1/Pos"]).toEqual({ _exists: true, x: 50 });
    });

    it("repeated undo/redo cycles remain stable", () => {
      const adapter = createAdapter();

      adapter.push([ecsMutation({ "e1/Pos": { _exists: true, x: 0 } })]);
      vi.advanceTimersByTime(1000);
      adapter.push([ecsMutation({ "e1/Pos": { x: 10 } })]);
      vi.advanceTimersByTime(1000);

      // Remote changes x to 50
      adapter.push([wsMutation({ "e1/Pos": { x: 50 } })]);

      // Cycle 1: undo then redo
      adapter.undo();
      let mut = adapter.pull()[0];
      adapter.push([{ patch: mut.patch, origin: Origin.History, syncBehavior: "document" }]);
      adapter.redo();
      mut = adapter.pull()[0];
      adapter.push([{ patch: mut.patch, origin: Origin.History, syncBehavior: "document" }]);
      expect(mut.patch["e1/Pos"]).toEqual({ x: 50 });

      // Cycle 2: undo then redo again — should still restore to 50
      adapter.undo();
      mut = adapter.pull()[0];
      adapter.push([{ patch: mut.patch, origin: Origin.History, syncBehavior: "document" }]);
      adapter.redo();
      mut = adapter.pull()[0];
      expect(mut.patch["e1/Pos"]).toEqual({ x: 50 });
    });
  });

  describe("multiple keys in single mutation", () => {
    it("handles mutations affecting multiple entity/component keys", () => {
      const adapter = createAdapter();

      adapter.push([
        ecsMutation({
          "e1/Pos": { _exists: true, x: 10 },
          "e2/Pos": { _exists: true, x: 20 },
        }),
      ]);
      vi.advanceTimersByTime(1000);

      const undid = adapter.undo();
      expect(undid).toBe(true);

      const mutation = adapter.pull();
      expect(mutation).toHaveLength(1);
      // Both keys should be in the inverse
      expect("e1/Pos" in mutation[0].patch).toBe(true);
      expect("e2/Pos" in mutation[0].patch).toBe(true);
    });
  });
});
