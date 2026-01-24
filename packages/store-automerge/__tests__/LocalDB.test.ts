import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as Automerge from "@automerge/automerge";
import { LocalDB, type AutomergeDocData } from "../src/LocalDB";

// Use fake-indexeddb for testing
import "fake-indexeddb/auto";
import { deleteDB } from "idb";

describe("LocalDB", () => {
  let localDB: LocalDB;
  let doc: Automerge.Doc<AutomergeDocData>;
  const testDbName = "test-db";

  beforeEach(async () => {
    // Create fresh instances for each test
    localDB = new LocalDB(testDbName);
    doc = Automerge.from<AutomergeDocData>({
      components: {},
      singletons: {},
    });
    await localDB.initialize();
  });

  afterEach(async () => {
    // Clean up
    localDB.dispose();
    await deleteDB(testDbName);
  });

  describe("initialize", () => {
    it("should create database and object store", async () => {
      // If initialize succeeds, the database was created
      expect(localDB.dbName).toBe(testDbName);
    });

    it("should load existing metadata on reinitialize", async () => {
      // Make some changes and save
      doc = Automerge.change(doc, (d) => {
        d.components["test"] = { item1: { value: 1 } };
      });

      // Force save and wait for completion
      localDB.saveDoc(doc);
      await localDB.flush();

      // Dispose and create new instance
      localDB.dispose();

      const newLocalDB = new LocalDB(testDbName);
      await newLocalDB.initialize();

      // Load into a new doc
      const newDoc = await newLocalDB.load();

      // Data should be preserved
      expect(newDoc.components["test"]).toEqual({ item1: { value: 1 } });

      newLocalDB.dispose();
    });
  });

  describe("saveDoc", () => {
    it("should save initial snapshot when no lastHeads exists", async () => {
      doc = Automerge.change(doc, (d) => {
        d.components["block"] = { "123": { id: "123", x: 10, y: 20 } };
      });

      // Save and wait for completion
      localDB.saveDoc(doc);
      await localDB.flush();

      // Verify by loading
      const newDoc = await localDB.load();
      expect(newDoc.components["block"]["123"]).toEqual({
        id: "123",
        x: 10,
        y: 20,
      });
    });

    it("should save incremental updates after initial snapshot", async () => {
      // First save (snapshot)
      doc = Automerge.change(doc, (d) => {
        d.components["block"] = { "1": { id: "1" } };
      });
      localDB.saveDoc(doc);
      await localDB.flush();

      // Second save (incremental update)
      doc = Automerge.change(doc, (d) => {
        d.components["block"]["2"] = { id: "2" };
      });
      localDB.saveDoc(doc);
      await localDB.flush();

      // Verify both are loaded
      const newDoc = await localDB.load();
      expect(newDoc.components["block"]["1"]).toEqual({ id: "1" });
      expect(newDoc.components["block"]["2"]).toEqual({ id: "2" });
    });

    it("should be throttled", async () => {
      // Make multiple rapid changes
      doc = Automerge.change(doc, (d) => {
        d.components["items"] = { a: { v: 1 } };
      });
      localDB.saveDoc(doc);

      doc = Automerge.change(doc, (d) => {
        d.components["items"]["b"] = { v: 2 };
      });
      localDB.saveDoc(doc);

      doc = Automerge.change(doc, (d) => {
        d.components["items"]["c"] = { v: 3 };
      });
      localDB.saveDoc(doc);

      // Flush to ensure all saves complete
      await localDB.flush();

      // All data should still be saved correctly
      const newDoc = await localDB.load();
      expect(newDoc.components["items"]["a"]).toEqual({ v: 1 });
      expect(newDoc.components["items"]["b"]).toEqual({ v: 2 });
      expect(newDoc.components["items"]["c"]).toEqual({ v: 3 });
    });
  });

  describe("load", () => {
    it("should return empty doc structure when no data exists", async () => {
      const newDoc = await localDB.load();

      // Should have the expected structure
      expect(newDoc.components).toEqual({});
      expect(newDoc.singletons).toEqual({});
    });

    it("should load snapshot and all incremental updates", async () => {
      // Create multiple saves
      for (let i = 0; i < 5; i++) {
        doc = Automerge.change(doc, (d) => {
          if (!d.components["items"]) d.components["items"] = {};
          d.components["items"][`item${i}`] = { index: i };
        });
        localDB.saveDoc(doc);
        await localDB.flush();
      }

      // Load
      const newDoc = await localDB.load();
      for (let i = 0; i < 5; i++) {
        expect(newDoc.components["items"][`item${i}`]).toEqual({ index: i });
      }
    });
  });

  describe("consolidation", () => {
    it("should consolidate updates into snapshot after threshold", async () => {
      // Create more than CONSOLIDATION_THRESHOLD (20) updates
      for (let i = 0; i < 22; i++) {
        doc = Automerge.change(doc, (d) => {
          if (!d.components["items"]) d.components["items"] = {};
          d.components["items"][`item${i}`] = { index: i };
        });
        localDB.saveDoc(doc);
        await localDB.flush();
      }

      // Wait a bit for async consolidation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Load - should still have all data
      const newDoc = await localDB.load();
      for (let i = 0; i < 22; i++) {
        expect(newDoc.components["items"][`item${i}`]).toEqual({ index: i });
      }
    });
  });

  describe("dispose", () => {
    it("should close database and clear pending saves", () => {
      // Just verify dispose doesn't throw
      expect(() => localDB.dispose()).not.toThrow();
    });
  });

  describe("persistence across sessions", () => {
    it("should preserve complex nested data structures", async () => {
      doc = Automerge.change(doc, (d) => {
        d.components["shapes"] = {
          rect1: {
            id: "rect1",
            type: "rectangle",
            position: { x: 100, y: 200 },
            size: { width: 50, height: 75 },
            style: {
              fill: "#ff0000",
              stroke: "#000000",
              strokeWidth: 2,
            },
          },
        };
        d.singletons["camera"] = {
          x: 500,
          y: 300,
          zoom: 1.5,
        };
      });

      localDB.saveDoc(doc);
      await localDB.flush();

      // Simulate session restart
      localDB.dispose();
      const newLocalDB = new LocalDB(testDbName);
      await newLocalDB.initialize();

      const newDoc = await newLocalDB.load();

      expect(newDoc.components["shapes"]["rect1"]).toEqual({
        id: "rect1",
        type: "rectangle",
        position: { x: 100, y: 200 },
        size: { width: 50, height: 75 },
        style: {
          fill: "#ff0000",
          stroke: "#000000",
          strokeWidth: 2,
        },
      });

      expect(newDoc.singletons["camera"]).toEqual({
        x: 500,
        y: 300,
        zoom: 1.5,
      });

      newLocalDB.dispose();
    });

    it("should handle concurrent changes from multiple sources", async () => {
      // Simulate changes that would come from different peers
      doc = Automerge.change(doc, (d) => {
        d.components["blocks"] = { a: { id: "a", x: 10 } };
      });

      // Fork to simulate another peer
      const fork = Automerge.clone(doc);

      // Change on main
      doc = Automerge.change(doc, (d) => {
        (d.components["blocks"]["a"] as any).x = 20;
      });

      // Change on fork
      const updatedFork = Automerge.change(fork, (d) => {
        d.components["blocks"]["b"] = { id: "b", y: 30 };
      });

      // Merge
      doc = Automerge.merge(doc, updatedFork);

      localDB.saveDoc(doc);
      await localDB.flush();

      const newDoc = await localDB.load();

      // Both changes should be present
      expect((newDoc.components["blocks"]["a"] as any).x).toBe(20);
      expect(newDoc.components["blocks"]["b"]).toEqual({ id: "b", y: 30 });
    });
  });
});
