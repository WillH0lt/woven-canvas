import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoroDoc } from "loro-crdt";
import { LocalDB } from "../src/LocalDB";

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
  const testDbName = "undo-redo-test";

  afterEach(async () => {
    await deleteDB(testDbName);
  });

  it("should persist state after undo operation", async () => {
    // Session 1: Create data, delete it, undo
    const localDB1 = new LocalDB(testDbName);
    const doc1 = new LoroDoc();
    await localDB1.initialize();

    // Create initial data
    const componentsMap = doc1.getMap("components");
    const blockMap = componentsMap.setContainer("Block", new (await import("loro-crdt")).LoroMap());
    const actualBlockMap = componentsMap.get("Block") as any;
    actualBlockMap.set("block-1", { id: "block-1", content: "Hello World" });
    doc1.commit();
    await localDB1.saveDoc(doc1);
    localDB1.saveDoc.flush();

    // Verify block exists
    expect(actualBlockMap.get("block-1")).toEqual({ id: "block-1", content: "Hello World" });

    // Delete the block
    actualBlockMap.delete("block-1");
    doc1.commit();
    await localDB1.saveDoc(doc1);
    localDB1.saveDoc.flush();

    // Verify block is deleted
    expect(actualBlockMap.get("block-1")).toBeUndefined();

    // Simulate undo by re-adding (in real system, UndoManager handles this)
    actualBlockMap.set("block-1", { id: "block-1", content: "Hello World" });
    doc1.commit();
    await localDB1.saveDoc(doc1);
    localDB1.saveDoc.flush();

    // Wait for save to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify block is back
    expect(actualBlockMap.get("block-1")).toEqual({ id: "block-1", content: "Hello World" });

    localDB1.dispose();

    // Session 2: Simulate page refresh
    const localDB2 = new LocalDB(testDbName);
    const doc2 = new LoroDoc();
    await localDB2.initialize();
    await localDB2.loadIntoDoc(doc2);

    // Block should still exist after "refresh"
    const loadedComponentsMap = doc2.getMap("components");
    const loadedBlockMap = loadedComponentsMap.get("Block") as any;
    expect(loadedBlockMap?.get("block-1")).toEqual({ id: "block-1", content: "Hello World" });

    localDB2.dispose();
  });

  it("should handle rapid changes before save completes", async () => {
    const localDB = new LocalDB(testDbName);
    const doc = new LoroDoc();
    await localDB.initialize();

    const componentsMap = doc.getMap("components");
    const blockMap = componentsMap.setContainer("Block", new (await import("loro-crdt")).LoroMap());
    const actualBlockMap = componentsMap.get("Block") as any;

    // Rapid changes simulating: create -> delete -> undo (all before throttle fires)
    actualBlockMap.set("block-1", { id: "block-1", v: 1 });
    doc.commit();
    localDB.saveDoc(doc); // Queued but not executed due to throttle

    actualBlockMap.delete("block-1");
    doc.commit();
    localDB.saveDoc(doc); // Queued

    actualBlockMap.set("block-1", { id: "block-1", v: 2 });
    doc.commit();
    localDB.saveDoc(doc); // Queued

    // Flush all pending saves
    localDB.saveDoc.flush();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify current state
    expect(actualBlockMap.get("block-1")).toEqual({ id: "block-1", v: 2 });

    localDB.dispose();

    // Reload and verify
    const localDB2 = new LocalDB(testDbName);
    const doc2 = new LoroDoc();
    await localDB2.initialize();
    await localDB2.loadIntoDoc(doc2);

    const loadedBlockMap = doc2.getMap("components").get("Block") as any;
    expect(loadedBlockMap?.get("block-1")).toEqual({ id: "block-1", v: 2 });

    localDB2.dispose();
  });

  it("should preserve state through consolidation", async () => {
    const localDB = new LocalDB(testDbName);
    const doc = new LoroDoc();
    await localDB.initialize();

    const componentsMap = doc.getMap("components");
    const blockMap = componentsMap.setContainer("Block", new (await import("loro-crdt")).LoroMap());
    const actualBlockMap = componentsMap.get("Block") as any;

    // Create many updates to trigger consolidation (threshold is 10)
    for (let i = 0; i < 15; i++) {
      actualBlockMap.set(`block-${i}`, { id: `block-${i}`, index: i });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();
    }

    // Wait for async consolidation
    await new Promise((resolve) => setTimeout(resolve, 200));

    localDB.dispose();

    // Reload and verify all data survived consolidation
    const localDB2 = new LocalDB(testDbName);
    const doc2 = new LoroDoc();
    await localDB2.initialize();
    await localDB2.loadIntoDoc(doc2);

    const loadedBlockMap = doc2.getMap("components").get("Block") as any;
    for (let i = 0; i < 15; i++) {
      expect(loadedBlockMap?.get(`block-${i}`)).toEqual({ id: `block-${i}`, index: i });
    }

    localDB2.dispose();
  });

  it("should handle delete then undo across consolidation boundary", async () => {
    const localDB = new LocalDB(testDbName);
    const doc = new LoroDoc();
    await localDB.initialize();

    const componentsMap = doc.getMap("components");
    const blockMap = componentsMap.setContainer("Block", new (await import("loro-crdt")).LoroMap());
    const actualBlockMap = componentsMap.get("Block") as any;

    // Create block
    actualBlockMap.set("important-block", { id: "important", content: "Keep me!" });
    doc.commit();
    await localDB.saveDoc(doc);
    localDB.saveDoc.flush();

    // Create many updates to trigger consolidation
    for (let i = 0; i < 12; i++) {
      actualBlockMap.set(`filler-${i}`, { id: `filler-${i}` });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();
    }

    // Wait for consolidation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Now delete the important block
    actualBlockMap.delete("important-block");
    doc.commit();
    await localDB.saveDoc(doc);
    localDB.saveDoc.flush();

    // Undo (restore the block)
    actualBlockMap.set("important-block", { id: "important", content: "Keep me!" });
    doc.commit();
    await localDB.saveDoc(doc);
    localDB.saveDoc.flush();

    await new Promise((resolve) => setTimeout(resolve, 100));

    localDB.dispose();

    // Reload - block should still exist
    const localDB2 = new LocalDB(testDbName);
    const doc2 = new LoroDoc();
    await localDB2.initialize();
    await localDB2.loadIntoDoc(doc2);

    const loadedBlockMap = doc2.getMap("components").get("Block") as any;
    expect(loadedBlockMap?.get("important-block")).toEqual({
      id: "important",
      content: "Keep me!",
    });

    localDB2.dispose();
  });
});

describe("Shallow Snapshot Behavior", () => {
  const testDbName = "shallow-snapshot-test";

  afterEach(async () => {
    await deleteDB(testDbName);
  });

  it("should correctly export and import shallow snapshot with current frontiers", async () => {
    const doc1 = new LoroDoc();

    // Create some data
    const map = doc1.getMap("test");
    map.set("key1", "value1");
    doc1.commit();

    // Export shallow snapshot
    const snapshot = doc1.export({
      mode: "shallow-snapshot",
      frontiers: doc1.frontiers(),
    });

    // Import into new doc
    const doc2 = new LoroDoc();
    doc2.import(snapshot);

    // Data should be present
    const loadedMap = doc2.getMap("test");
    expect(loadedMap.get("key1")).toBe("value1");
  });

  it("should preserve latest state in shallow snapshot after multiple changes", async () => {
    const doc1 = new LoroDoc();
    const map = doc1.getMap("test");

    // Multiple changes
    map.set("counter", 1);
    doc1.commit();
    map.set("counter", 2);
    doc1.commit();
    map.set("counter", 3);
    doc1.commit();

    // Export at current frontiers
    const snapshot = doc1.export({
      mode: "shallow-snapshot",
      frontiers: doc1.frontiers(),
    });

    // Import
    const doc2 = new LoroDoc();
    doc2.import(snapshot);

    // Should have latest value
    expect(doc2.getMap("test").get("counter")).toBe(3);
  });

  it("should preserve state after delete in shallow snapshot", async () => {
    const doc1 = new LoroDoc();
    const map = doc1.getMap("items");

    // Create items
    map.set("item1", { name: "First" });
    map.set("item2", { name: "Second" });
    doc1.commit();

    // Delete one
    map.delete("item1");
    doc1.commit();

    // Export
    const snapshot = doc1.export({
      mode: "shallow-snapshot",
      frontiers: doc1.frontiers(),
    });

    // Import
    const doc2 = new LoroDoc();
    doc2.import(snapshot);

    const loadedMap = doc2.getMap("items");
    expect(loadedMap.get("item1")).toBeUndefined();
    expect(loadedMap.get("item2")).toEqual({ name: "Second" });
  });
});
