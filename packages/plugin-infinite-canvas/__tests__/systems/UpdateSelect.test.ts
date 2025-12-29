import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  hasComponent,
  type EditorPlugin,
  defineQuery,
  Synced,
} from "@infinitecanvas/editor";
import {
  Block,
  Aabb,
  Selected,
  SelectionBox,
  Hovered,
  Opacity,
} from "../../src/components";
import { Intersect, RankBounds } from "../../src/singletons";
import { PreCaptureIntersect } from "../../src/systems/PreCaptureIntersect";
import { UpdateSelect } from "../../src/systems/UpdateSelect";
import {
  AddSelectionBox,
  UpdateSelectionBox,
  RemoveSelectionBox,
} from "../../src/commands";

// Query for selection box entities
const selectionBoxQuery = defineQuery((q) => q.with(Block, SelectionBox));

// Factory function to create test plugin
const testPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Aabb, Selected, SelectionBox, Hovered, Opacity],
  singletons: [Intersect, RankBounds],
  preCaptureSystems: [PreCaptureIntersect],
  updateSystems: [UpdateSelect],
};

describe("UpdateSelectSystem", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    domElement = document.createElement("div");
    document.body.appendChild(domElement);

    editor = new Editor(domElement, { plugins: [testPlugin] });
    await editor.initialize();
  });

  afterEach(async () => {
    if (editor) {
      await editor.dispose();
    }
    if (domElement && domElement.parentNode) {
      domElement.parentNode.removeChild(domElement);
    }
  });

  describe("AddSelectionBox command", () => {
    it("should create a selection box entity when AddSelectionBox is spawned", async () => {
      let selectionBoxCount = 0;

      // Spawn the command using editor.command (queues for next tick start)
      editor.command(AddSelectionBox);

      // Process the command
      await editor.tick();

      // Check that selection box was created
      editor.nextTick((ctx) => {
        selectionBoxCount = selectionBoxQuery.current(ctx).length;
      });

      await editor.tick();
      expect(selectionBoxCount).toBe(1);
    });

    it("should create selection box with correct initial values", async () => {
      let position: number[] | undefined;
      let size: number[] | undefined;
      let rank: string | undefined;

      editor.command(AddSelectionBox);

      await editor.tick();

      editor.nextTick((ctx) => {
        const selectionBoxes = selectionBoxQuery.current(ctx);
        if (selectionBoxes.length > 0) {
          const block = Block.read(ctx, selectionBoxes[0]);
          position = [...block.position];
          size = [...block.size];
          rank = block.rank;
        }
      });

      await editor.tick();
      expect(position).toEqual([0, 0]);
      expect(size).toEqual([0, 0]);
      expect(rank).toBe("z"); // Selection box should be on top
    });
  });

  describe("UpdateSelectionBox command", () => {
    it("should update selection box position and size from bounds", async () => {
      let position: number[] | undefined;
      let size: number[] | undefined;

      // First create a selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update the selection box bounds
      editor.command(UpdateSelectionBox, {
        bounds: [10, 20, 110, 120], // left, top, right, bottom
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const selectionBoxes = selectionBoxQuery.current(ctx);
        if (selectionBoxes.length > 0) {
          const block = Block.read(ctx, selectionBoxes[0]);
          position = [...block.position];
          size = [...block.size];
        }
      });

      await editor.tick();
      expect(position).toEqual([10, 20]);
      expect(size).toEqual([100, 100]); // width = 110-10, height = 120-20
    });

    it("should select blocks that intersect with the selection box", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      // Create a synced block - AABB will be computed by preCaptureIntersect
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      // Let preCaptureIntersect compute AABB
      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to intersect with the block
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 75, 75], // Intersects with the block at [50,50,100,100]
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(true);
    });

    it("should not select blocks that do not intersect with the selection box", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      // Create a synced block
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [200, 200],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      // Let preCaptureIntersect compute AABB
      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box - does NOT intersect with the block
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 100, 100],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });

    it("should deselect blocks outside selection box when deselectOthers is true", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;

      // Create two synced blocks, both pre-selected
      editor.nextTick((ctx) => {
        entityId1 = createEntity(ctx);
        addComponent(ctx, entityId1, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId1, Synced, {});
        addComponent(ctx, entityId1, Selected, { selectedBy: "" });

        entityId2 = createEntity(ctx);
        addComponent(ctx, entityId2, Block, {
          position: [200, 200],
          size: [50, 50],
          rank: "b",
        });
        addComponent(ctx, entityId2, Synced, {});
        addComponent(ctx, entityId2, Selected, { selectedBy: "" });
      });

      // Let preCaptureIntersect compute AABBs
      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to only intersect with entityId1, with deselectOthers=true
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 110, 110], // Only intersects with entityId1
        deselectOthers: true,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(true);
      expect(isSelected2).toBe(false); // Should be deselected
    });

    it("should NOT deselect blocks outside selection box when deselectOthers is false", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;

      // Create two synced blocks, both pre-selected
      editor.nextTick((ctx) => {
        entityId1 = createEntity(ctx);
        addComponent(ctx, entityId1, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId1, Synced, {});
        addComponent(ctx, entityId1, Selected, { selectedBy: "" });

        entityId2 = createEntity(ctx);
        addComponent(ctx, entityId2, Block, {
          position: [200, 200],
          size: [50, 50],
          rank: "b",
        });
        addComponent(ctx, entityId2, Synced, {});
        addComponent(ctx, entityId2, Selected, { selectedBy: "" });
      });

      // Let preCaptureIntersect compute AABBs
      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to only intersect with entityId1, with deselectOthers=false
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 110, 110],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(true);
      expect(isSelected2).toBe(true); // Should remain selected
    });

    it("should warn when updating a non-existent selection box", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Try to update without creating a selection box first
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 100, 100],
        deselectOthers: false,
      });

      await editor.tick();

      expect(warnSpy).toHaveBeenCalledWith(
        "Can't update selection box: not found"
      );
      warnSpy.mockRestore();
    });
  });

  describe("RemoveSelectionBox command", () => {
    it("should remove the selection box entity", async () => {
      let selectionBoxCount = 0;

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Verify it exists
      editor.nextTick((ctx) => {
        selectionBoxCount = selectionBoxQuery.current(ctx).length;
      });

      await editor.tick();
      expect(selectionBoxCount).toBe(1);

      // Remove it
      editor.command(RemoveSelectionBox);
      await editor.tick();

      editor.nextTick((ctx) => {
        selectionBoxCount = selectionBoxQuery.current(ctx).length;
      });

      await editor.tick();
      expect(selectionBoxCount).toBe(0);
    });

    it("should warn when removing a non-existent selection box", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Try to remove without creating a selection box first
      editor.command(RemoveSelectionBox);
      await editor.tick();

      expect(warnSpy).toHaveBeenCalledWith(
        "Can't remove selection box: not found"
      );
      warnSpy.mockRestore();
    });
  });

  describe("selection of multiple blocks", () => {
    it("should select multiple intersecting blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let entityId3: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;
      let isSelected3 = false;

      // Create three synced blocks
      editor.nextTick((ctx) => {
        entityId1 = createEntity(ctx);
        addComponent(ctx, entityId1, Block, {
          position: [10, 10],
          size: [30, 30],
          rank: "a",
        });
        addComponent(ctx, entityId1, Synced, {});

        entityId2 = createEntity(ctx);
        addComponent(ctx, entityId2, Block, {
          position: [50, 50],
          size: [30, 30],
          rank: "b",
        });
        addComponent(ctx, entityId2, Synced, {});

        entityId3 = createEntity(ctx);
        addComponent(ctx, entityId3, Block, {
          position: [200, 200],
          size: [30, 30],
          rank: "c",
        });
        addComponent(ctx, entityId3, Synced, {});
      });

      // Let preCaptureIntersect compute AABBs
      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to intersect with entityId1 and entityId2 but not entityId3
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 100, 100],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
        isSelected3 = hasComponent(ctx, entityId3!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(true);
      expect(isSelected2).toBe(true);
      expect(isSelected3).toBe(false);
    });
  });

  describe("non-synced blocks", () => {
    it("should not select blocks without Synced component", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      // Create a block WITHOUT Synced component
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        // Note: No Synced component - AABB will still be computed
      });

      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to cover the block
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 150, 150],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });

    it("should select synced blocks with auto-computed Aabb", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      // Create a synced block - preCaptureIntersect will auto-add AABB
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
      });

      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to cover the block position
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 150, 150],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      // Since preCaptureIntersect adds AABB and the block is synced,
      // it should be selected
      expect(isSelected).toBe(true);
    });
  });

  describe("already selected blocks", () => {
    it("should not re-add Selected component to already selected blocks", async () => {
      let entityId: number | undefined;
      let selectedBy: string | undefined;

      // Create a synced block that's already selected
      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [50, 50],
          size: [50, 50],
          rank: "a",
        });
        addComponent(ctx, entityId, Synced, {});
        addComponent(ctx, entityId, Selected, { selectedBy: "original" });
      });

      await editor.tick();

      // Create selection box
      editor.command(AddSelectionBox);
      await editor.tick();

      // Update selection box to intersect with the block
      editor.command(UpdateSelectionBox, {
        bounds: [0, 0, 150, 150],
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const selected = Selected.read(ctx, entityId!);
        selectedBy = selected.selectedBy;
      });

      await editor.tick();
      // The original selectedBy value should be preserved
      expect(selectedBy).toBe("original");
    });
  });
});
