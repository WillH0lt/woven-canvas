import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as Automerge from "@automerge/automerge";
import { LocalDB, type AutomergeDocData } from "../src/LocalDB";

// Use fake-indexeddb for testing
import "fake-indexeddb/auto";
import { deleteDB } from "idb";

/**
 * These tests specifically target the undo/redo persistence issue:
 * - Delete a block
 * - Undo
 * - Refresh (simulated by dispose + reinitialize)
 * - Block should still exist
 */
describe("Undo/Redo Persistence", () => {
  let testDbName: string;
  let localDB: LocalDB | null = null;

  beforeEach(() => {
    // Use unique database name per test to ensure isolation
    testDbName = `undo-redo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(async () => {
    if (localDB) {
      localDB.dispose();
      localDB = null;
    }
    try {
      await deleteDB(testDbName);
    } catch (e) {
      console.warn("Failed to delete DB:", e);
    }
  });

  it("should persist state after undo operation", async () => {
    // Session 1: Create data
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    let doc1 = await localDB.load();

    // Create initial data
    doc1 = Automerge.change(doc1, (d) => {
      d.components["Block"] = {
        "block-1": { id: "block-1", content: "Hello World" },
      };
    });
    localDB.saveDoc(doc1);
    await localDB.flush();

    // Verify block exists
    expect(doc1.components["Block"]["block-1"]).toEqual({
      id: "block-1",
      content: "Hello World",
    });

    // Dispose session 1
    localDB.dispose();
    localDB = null;

    // Session 2: Reload
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    const doc2 = await localDB.load();

    // Block should still exist after "refresh"
    expect(doc2.components["Block"]?.["block-1"]).toEqual({
      id: "block-1",
      content: "Hello World",
    });
  });

  it("should handle rapid changes before save completes", async () => {
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    let doc = await localDB.load();

    // Rapid changes simulating: create -> delete -> undo (all before throttle fires)
    doc = Automerge.change(doc, (d) => {
      d.components["Block"] = { "block-1": { id: "block-1", v: 1 } };
    });
    localDB.saveDoc(doc); // First call - saves immediately

    doc = Automerge.change(doc, (d) => {
      delete d.components["Block"]["block-1"];
    });
    localDB.saveDoc(doc); // Second call - queued (throttled)

    doc = Automerge.change(doc, (d) => {
      d.components["Block"]["block-1"] = { id: "block-1", v: 2 };
    });
    localDB.saveDoc(doc); // Third call - queued (throttled), replaces second

    // Flush and wait for completion
    await localDB.flush();

    // Verify current state
    expect(doc.components["Block"]["block-1"]).toEqual({ id: "block-1", v: 2 });

    localDB.dispose();
    localDB = null;

    // Reload and verify
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    const doc2 = await localDB.load();

    expect(doc2.components["Block"]?.["block-1"]).toEqual({
      id: "block-1",
      v: 2,
    });
  });

  it("should preserve state through consolidation", async () => {
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    let doc = await localDB.load();

    // Create initial block component
    doc = Automerge.change(doc, (d) => {
      d.components["Block"] = {};
    });
    localDB.saveDoc(doc);
    await localDB.flush();

    // Create many updates to trigger consolidation (threshold is 20)
    for (let i = 0; i < 25; i++) {
      doc = Automerge.change(doc, (d) => {
        d.components["Block"][`block-${i}`] = { id: `block-${i}`, index: i };
      });
      localDB.saveDoc(doc);
      await localDB.flush();
    }

    localDB.dispose();
    localDB = null;

    // Reload and verify all data survived consolidation
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    const doc2 = await localDB.load();

    for (let i = 0; i < 25; i++) {
      expect(doc2.components["Block"]?.[`block-${i}`]).toEqual({
        id: `block-${i}`,
        index: i,
      });
    }
  });

  it("should handle delete then undo across consolidation boundary", async () => {
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    let doc = await localDB.load();

    // Create block
    doc = Automerge.change(doc, (d) => {
      d.components["Block"] = {
        "important-block": { id: "important", content: "Keep me!" },
      };
    });
    localDB.saveDoc(doc);
    await localDB.flush();

    // Create many updates to trigger consolidation
    for (let i = 0; i < 22; i++) {
      doc = Automerge.change(doc, (d) => {
        d.components["Block"][`filler-${i}`] = { id: `filler-${i}` };
      });
      localDB.saveDoc(doc);
      await localDB.flush();
    }

    // Now delete the important block
    doc = Automerge.change(doc, (d) => {
      delete d.components["Block"]["important-block"];
    });
    localDB.saveDoc(doc);
    await localDB.flush();

    // Undo (restore the block)
    doc = Automerge.change(doc, (d) => {
      d.components["Block"]["important-block"] = {
        id: "important",
        content: "Keep me!",
      };
    });
    localDB.saveDoc(doc);
    await localDB.flush();

    localDB.dispose();
    localDB = null;

    // Reload - block should still exist
    localDB = new LocalDB(testDbName);
    await localDB.initialize();
    const doc2 = await localDB.load();

    expect(doc2.components["Block"]?.["important-block"]).toEqual({
      id: "important",
      content: "Keep me!",
    });
  });
});

describe("Automerge Binary Snapshot Behavior", () => {
  // Automerge uses binary format instead of Loro's shallow snapshots
  // These tests verify the save/load cycle works correctly

  it("should correctly export and import binary snapshot", async () => {
    type TestDoc = { test: { [key: string]: string } };
    let doc1 = Automerge.init<TestDoc>();

    // Create some data
    doc1 = Automerge.change(doc1, (d) => {
      d.test = { key1: "value1" };
    });

    // Export binary snapshot
    const snapshot = Automerge.save(doc1);

    // Import into new doc
    const doc2 = Automerge.load<TestDoc>(snapshot);

    // Data should be present
    expect(doc2.test.key1).toBe("value1");
  });

  it("should preserve latest state in binary snapshot after multiple changes", async () => {
    type TestDoc = { test: { counter: number } };
    let doc1 = Automerge.init<TestDoc>();

    // Multiple changes
    doc1 = Automerge.change(doc1, (d) => {
      d.test = { counter: 1 };
    });
    doc1 = Automerge.change(doc1, (d) => {
      d.test.counter = 2;
    });
    doc1 = Automerge.change(doc1, (d) => {
      d.test.counter = 3;
    });

    // Export
    const snapshot = Automerge.save(doc1);

    // Import
    const doc2 = Automerge.load<TestDoc>(snapshot);

    // Should have latest value
    expect(doc2.test.counter).toBe(3);
  });

  it("should preserve state after delete in binary snapshot", async () => {
    type TestDoc = { items: { [key: string]: { name: string } | undefined } };
    let doc1 = Automerge.init<TestDoc>();

    // Create items
    doc1 = Automerge.change(doc1, (d) => {
      d.items = {
        item1: { name: "First" },
        item2: { name: "Second" },
      };
    });

    // Delete one
    doc1 = Automerge.change(doc1, (d) => {
      delete d.items["item1"];
    });

    // Export
    const snapshot = Automerge.save(doc1);

    // Import
    const doc2 = Automerge.load<TestDoc>(snapshot);

    expect(doc2.items["item1"]).toBeUndefined();
    expect(doc2.items["item2"]).toEqual({ name: "Second" });
  });

  it("should support viewing document at previous heads", async () => {
    type TestDoc = { counter: number };
    let doc = Automerge.init<TestDoc>();

    // Initial state
    doc = Automerge.change(doc, (d) => {
      d.counter = 1;
    });
    const heads1 = Automerge.getHeads(doc);

    // Second state
    doc = Automerge.change(doc, (d) => {
      d.counter = 2;
    });
    const heads2 = Automerge.getHeads(doc);

    // Third state
    doc = Automerge.change(doc, (d) => {
      d.counter = 3;
    });

    // Current should be 3
    expect(doc.counter).toBe(3);

    // View at heads1 should be 1
    const view1 = Automerge.view(doc, heads1);
    expect(view1.counter).toBe(1);

    // View at heads2 should be 2
    const view2 = Automerge.view(doc, heads2);
    expect(view2.counter).toBe(2);
  });
});
