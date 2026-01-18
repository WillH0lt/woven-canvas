import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LoroDoc } from "loro-crdt";
import { LocalDB } from "../src/LocalDB";

// Use fake-indexeddb for testing
import "fake-indexeddb/auto";
import { deleteDB } from "idb";

describe("LocalDB", () => {
  let localDB: LocalDB;
  let doc: LoroDoc;
  const testDbName = "test-db";

  beforeEach(async () => {
    // Create fresh instances for each test
    localDB = new LocalDB(testDbName);
    doc = new LoroDoc();
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
      const componentsMap = doc.getMap("components");
      componentsMap.set("test", { value: 1 });
      doc.commit();

      // Force save (bypass throttle for testing)
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      // Dispose and create new instance
      localDB.dispose();

      const newLocalDB = new LocalDB(testDbName);
      await newLocalDB.initialize();

      // Load into a new doc
      const newDoc = new LoroDoc();
      await newLocalDB.loadIntoDoc(newDoc);

      // Data should be preserved
      const loadedMap = newDoc.getMap("components");
      expect(loadedMap.get("test")).toEqual({ value: 1 });

      newLocalDB.dispose();
    });
  });

  describe("saveDoc", () => {
    it("should save initial snapshot when no lastVersion exists", async () => {
      const componentsMap = doc.getMap("components");
      componentsMap.set("block", { id: "123", x: 10, y: 20 });
      doc.commit();

      // Save and flush throttle
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      // Verify by loading into new doc
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      expect(loadedMap.get("block")).toEqual({ id: "123", x: 10, y: 20 });
    });

    it("should save incremental updates after initial snapshot", async () => {
      // First save (snapshot)
      const componentsMap = doc.getMap("components");
      componentsMap.set("block1", { id: "1" });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      // Second save (incremental update)
      componentsMap.set("block2", { id: "2" });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      // Verify both are loaded
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      expect(loadedMap.get("block1")).toEqual({ id: "1" });
      expect(loadedMap.get("block2")).toEqual({ id: "2" });
    });

    it("should be throttled", async () => {
      const componentsMap = doc.getMap("components");

      // Make multiple rapid changes
      componentsMap.set("a", { v: 1 });
      doc.commit();
      localDB.saveDoc(doc);

      componentsMap.set("b", { v: 2 });
      doc.commit();
      localDB.saveDoc(doc);

      componentsMap.set("c", { v: 3 });
      doc.commit();
      localDB.saveDoc(doc);

      // Flush to ensure all saves complete
      localDB.saveDoc.flush();

      // All data should still be saved correctly
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      expect(loadedMap.get("a")).toEqual({ v: 1 });
      expect(loadedMap.get("b")).toEqual({ v: 2 });
      expect(loadedMap.get("c")).toEqual({ v: 3 });
    });
  });

  describe("loadIntoDoc", () => {
    it("should load empty doc when no data exists", async () => {
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      // Should not throw and doc should be usable
      const map = newDoc.getMap("test");
      expect(map.toJSON()).toEqual({});
    });

    it("should load snapshot and all incremental updates", async () => {
      const componentsMap = doc.getMap("components");

      // Create multiple saves
      for (let i = 0; i < 5; i++) {
        componentsMap.set(`item${i}`, { index: i });
        doc.commit();
        await localDB.saveDoc(doc);
        localDB.saveDoc.flush();
      }

      // Load into new doc
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      for (let i = 0; i < 5; i++) {
        expect(loadedMap.get(`item${i}`)).toEqual({ index: i });
      }
    });
  });

  describe("consolidation", () => {
    it("should consolidate updates into snapshot after threshold", async () => {
      const componentsMap = doc.getMap("components");

      // Create more than CONSOLIDATION_THRESHOLD (10) updates
      for (let i = 0; i < 12; i++) {
        componentsMap.set(`item${i}`, { index: i });
        doc.commit();
        await localDB.saveDoc(doc);
        localDB.saveDoc.flush();
      }

      // Wait a bit for async consolidation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Load into new doc - should still have all data
      const newDoc = new LoroDoc();
      await localDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      for (let i = 0; i < 12; i++) {
        expect(loadedMap.get(`item${i}`)).toEqual({ index: i });
      }
    });
  });

  describe("dispose", () => {
    it("should cancel pending saves and close database", () => {
      const cancelSpy = vi.spyOn(localDB.saveDoc, "cancel");

      localDB.dispose();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe("persistence across sessions", () => {
    it("should persist data across dispose and reinitialize", async () => {
      // Save some data
      const componentsMap = doc.getMap("components");
      componentsMap.set("persistent", { data: "test" });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      // Simulate session end
      localDB.dispose();

      // Simulate new session
      const newLocalDB = new LocalDB(testDbName);
      await newLocalDB.initialize();

      const newDoc = new LoroDoc();
      await newLocalDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("components");
      expect(loadedMap.get("persistent")).toEqual({ data: "test" });

      newLocalDB.dispose();
    });

    it("should handle complex nested data structures", async () => {
      const singletonsMap = doc.getMap("singletons");
      singletonsMap.set("viewport", {
        camera: { x: 100, y: 200, zoom: 1.5 },
        selection: ["id1", "id2", "id3"],
      });
      doc.commit();
      await localDB.saveDoc(doc);
      localDB.saveDoc.flush();

      localDB.dispose();

      const newLocalDB = new LocalDB(testDbName);
      await newLocalDB.initialize();

      const newDoc = new LoroDoc();
      await newLocalDB.loadIntoDoc(newDoc);

      const loadedMap = newDoc.getMap("singletons");
      expect(loadedMap.get("viewport")).toEqual({
        camera: { x: 100, y: 200, zoom: 1.5 },
        selection: ["id1", "id2", "id3"],
      });

      newLocalDB.dispose();
    });
  });
});
