import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  hasComponent,
  type EditorPlugin,
} from "@infinitecanvas/editor";
import {
  Block,
  Aabb,
  Selected,
} from "../../src/components";
import { RankBounds, Cursor } from "../../src/singletons";
import { UpdateBlock } from "../../src/systems/UpdateBlock";
import {
  SelectBlock,
  DeselectBlock,
  ToggleSelect,
  DeselectAll,
  SelectAll,
  RemoveBlock,
  RemoveSelected,
  DragBlock,
  BringForwardSelected,
  SendBackwardSelected,
  BringToFrontSelected,
  SendToBackSelected,
  SetCursor,
} from "../../src/commands";
import { createBlock } from "../testUtils";

// Factory function to create test plugin
const testPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Aabb, Selected],
  singletons: [RankBounds, Cursor],
  updateSystems: [UpdateBlock],
};

describe("UpdateBlock", () => {
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

  describe("DragBlock command", () => {
    it("should update block position when DragBlock is spawned", async () => {
      let entityId: number | undefined;
      let position: number[] | undefined;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { position: [100, 100] });
      });

      await editor.tick();

      editor.command(DragBlock, {
        entityId: entityId!,
        position: [200, 300],
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!);
        position = [...block.position];
      });

      await editor.tick();
      expect(position).toEqual([200, 300]);
    });

    it("should not update position for non-block entities", async () => {
      let entityId: number | undefined;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        // No Block component added
      });

      await editor.tick();

      // This should not throw, just silently return
      editor.command(DragBlock, {
        entityId: entityId!,
        position: [200, 300],
      });

      await editor.tick();
      // Test passes if no error is thrown
    });
  });

  describe("SelectBlock command", () => {
    it("should add Selected component when SelectBlock is spawned", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      editor.command(SelectBlock, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(true);
    });

    it("should not re-add Selected component if already selected", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true });
      });

      await editor.tick();

      editor.command(SelectBlock, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(true);
    });

    it("should deselect others when deselectOthers is true", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true });
        entityId2 = createBlock(ctx, { position: [200, 200], selected: false });
      });

      await editor.tick();

      editor.command(SelectBlock, {
        entityId: entityId2!,
        deselectOthers: true,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(false);
      expect(isSelected2).toBe(true);
    });

    it("should not deselect others when deselectOthers is false", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true });
        entityId2 = createBlock(ctx, { position: [200, 200], selected: false });
      });

      await editor.tick();

      editor.command(SelectBlock, {
        entityId: entityId2!,
        deselectOthers: false,
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(true);
      expect(isSelected2).toBe(true);
    });
  });

  describe("DeselectBlock command", () => {
    it("should remove Selected component when DeselectBlock is spawned", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true });
      });

      await editor.tick();

      editor.command(DeselectBlock, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });

    it("should do nothing if block is not selected", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      editor.command(DeselectBlock, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });
  });

  describe("ToggleSelect command", () => {
    it("should add Selected component if not selected", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      editor.command(ToggleSelect, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(true);
    });

    it("should remove Selected component if selected", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true });
      });

      await editor.tick();

      editor.command(ToggleSelect, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });
  });

  describe("DeselectAll command", () => {
    it("should deselect all selected blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let entityId3: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;
      let isSelected3 = false;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true });
        entityId2 = createBlock(ctx, { position: [100, 100], selected: true });
        entityId3 = createBlock(ctx, { position: [200, 200], selected: true });
      });

      await editor.tick();

      editor.command(DeselectAll);

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
        isSelected3 = hasComponent(ctx, entityId3!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(false);
      expect(isSelected2).toBe(false);
      expect(isSelected3).toBe(false);
    });

    it("should do nothing if no blocks are selected", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      editor.command(DeselectAll);

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });
  });

  describe("SelectAll command", () => {
    it("should select all persistent blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let isSelected1 = false;
      let isSelected2 = false;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          persistent: true,
          selected: false,
        });
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          persistent: true,
          selected: false,
        });
      });

      await editor.tick();

      editor.command(SelectAll);

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected);
        isSelected2 = hasComponent(ctx, entityId2!, Selected);
      });

      await editor.tick();
      expect(isSelected1).toBe(true);
      expect(isSelected2).toBe(true);
    });

    it("should not select non-persistent blocks", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          persistent: false,
          selected: false,
        });
      });

      await editor.tick();

      editor.command(SelectAll);

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(false);
    });

    it("should not re-add Selected component to already selected blocks", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          persistent: true,
          selected: true,
        });
      });

      await editor.tick();

      editor.command(SelectAll);

      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      expect(isSelected).toBe(true);
    });
  });

  describe("RemoveBlock command", () => {
    it("should remove the specified block entity", async () => {
      let entityId: number | undefined;
      let entityRemoved = false;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx);
      });

      await editor.tick();

      editor.command(RemoveBlock, { entityId: entityId! });

      await editor.tick();

      editor.nextTick((ctx) => {
        // hasComponent throws when entity doesn't exist
        try {
          hasComponent(ctx, entityId!, Block);
          entityRemoved = false;
        } catch {
          entityRemoved = true;
        }
      });

      await editor.tick();
      expect(entityRemoved).toBe(true);
    });
  });

  describe("RemoveSelected command", () => {
    it("should remove all selected blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let entityId3: number | undefined;
      let entity1Removed = false;
      let entity2Removed = false;
      let entity3Exists = false;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true });
        entityId2 = createBlock(ctx, { position: [100, 100], selected: true });
        entityId3 = createBlock(ctx, { position: [200, 200], selected: false });
      });

      await editor.tick();

      editor.command(RemoveSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        // hasComponent throws when entity doesn't exist
        try {
          hasComponent(ctx, entityId1!, Block);
          entity1Removed = false;
        } catch {
          entity1Removed = true;
        }
        try {
          hasComponent(ctx, entityId2!, Block);
          entity2Removed = false;
        } catch {
          entity2Removed = true;
        }
        try {
          hasComponent(ctx, entityId3!, Block);
          entity3Exists = true;
        } catch {
          entity3Exists = false;
        }
      });

      await editor.tick();
      expect(entity1Removed).toBe(true);
      expect(entity2Removed).toBe(true);
      expect(entity3Exists).toBe(true); // Unselected block should remain
    });

    it("should do nothing if no blocks are selected", async () => {
      let entityId: number | undefined;
      let hasBlock = true;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      editor.command(RemoveSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        hasBlock = hasComponent(ctx, entityId!, Block);
      });

      await editor.tick();
      expect(hasBlock).toBe(true);
    });
  });

  describe("BringForwardSelected / BringToFrontSelected commands", () => {
    it("should assign new ranks to selected blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let rank1Before: string | undefined;
      let rank2Before: string | undefined;
      let rank1After: string | undefined;
      let rank2After: string | undefined;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: "a",
          selected: true,
        });
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: "m",
          selected: false,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1Before = Block.read(ctx, entityId1!).rank;
        rank2Before = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      editor.command(BringForwardSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank;
        rank2After = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      // Selected block should have a new rank
      expect(rank1After).not.toBe(rank1Before);
      // Unselected block should keep its rank
      expect(rank2After).toBe(rank2Before);
    });

    it("should preserve relative order of multiple selected blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let rank1After: string | undefined;
      let rank2After: string | undefined;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: "a",
          selected: true,
        });
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: "m",
          selected: true,
        });
      });

      await editor.tick();

      editor.command(BringToFrontSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank;
        rank2After = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      // The block that was originally higher (entityId2 with rank "m")
      // should still be higher after the operation
      expect(rank2After! > rank1After!).toBe(true);
    });

    it("should do nothing if no blocks are selected", async () => {
      let entityId: number | undefined;
      let rankBefore: string | undefined;
      let rankAfter: string | undefined;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          rank: "m",
          selected: false,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rankBefore = Block.read(ctx, entityId!).rank;
      });

      await editor.tick();

      editor.command(BringForwardSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rankAfter = Block.read(ctx, entityId!).rank;
      });

      await editor.tick();
      expect(rankAfter).toBe(rankBefore);
    });
  });

  describe("SendBackwardSelected / SendToBackSelected commands", () => {
    it("should assign new ranks to selected blocks", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let rank1Before: string | undefined;
      let rank2Before: string | undefined;
      let rank1After: string | undefined;
      let rank2After: string | undefined;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: "m",
          selected: true,
        });
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: "a",
          selected: false,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1Before = Block.read(ctx, entityId1!).rank;
        rank2Before = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      editor.command(SendBackwardSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank;
        rank2After = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      // Selected block should have a new rank
      expect(rank1After).not.toBe(rank1Before);
      // Unselected block should keep its rank
      expect(rank2After).toBe(rank2Before);
    });

    it("should preserve relative order of multiple selected blocks (highest first)", async () => {
      let entityId1: number | undefined;
      let entityId2: number | undefined;
      let rank1After: string | undefined;
      let rank2After: string | undefined;

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: "a",
          selected: true,
        });
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: "m",
          selected: true,
        });
      });

      await editor.tick();

      editor.command(SendToBackSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank;
        rank2After = Block.read(ctx, entityId2!).rank;
      });

      await editor.tick();

      // The block that was originally higher (entityId2 with rank "m")
      // should still be higher after the operation
      expect(rank2After! > rank1After!).toBe(true);
    });

    it("should do nothing if no blocks are selected", async () => {
      let entityId: number | undefined;
      let rankBefore: string | undefined;
      let rankAfter: string | undefined;

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          rank: "m",
          selected: false,
        });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        rankBefore = Block.read(ctx, entityId!).rank;
      });

      await editor.tick();

      editor.command(SendBackwardSelected);

      await editor.tick();

      editor.nextTick((ctx) => {
        rankAfter = Block.read(ctx, entityId!).rank;
      });

      await editor.tick();
      expect(rankAfter).toBe(rankBefore);
    });
  });

  describe("SetCursor command", () => {
    it("should set the cursor svg", async () => {
      let svg: string | undefined;

      editor.command(SetCursor, { svg: "<svg>test</svg>" });

      await editor.tick();

      editor.nextTick((ctx) => {
        svg = Cursor.read(ctx).svg;
      });

      await editor.tick();
      expect(svg).toBe("<svg>test</svg>");
    });

    it("should set the cursor contextSvg", async () => {
      let contextSvg: string | undefined;

      editor.command(SetCursor, { contextSvg: "<svg>context</svg>" });

      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();
      expect(contextSvg).toBe("<svg>context</svg>");
    });

    it("should set both svg and contextSvg", async () => {
      let svg: string | undefined;
      let contextSvg: string | undefined;

      editor.command(SetCursor, {
        svg: "<svg>base</svg>",
        contextSvg: "<svg>context</svg>",
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        const cursor = Cursor.read(ctx);
        svg = cursor.svg;
        contextSvg = cursor.contextSvg;
      });

      await editor.tick();
      expect(svg).toBe("<svg>base</svg>");
      expect(contextSvg).toBe("<svg>context</svg>");
    });

    it("should not modify svg if only contextSvg is provided", async () => {
      let svg: string | undefined;

      // First set svg
      editor.command(SetCursor, { svg: "<svg>original</svg>" });
      await editor.tick();

      // Then set only contextSvg
      editor.command(SetCursor, { contextSvg: "<svg>context</svg>" });
      await editor.tick();

      editor.nextTick((ctx) => {
        svg = Cursor.read(ctx).svg;
      });

      await editor.tick();
      expect(svg).toBe("<svg>original</svg>");
    });

    it("should not modify contextSvg if only svg is provided", async () => {
      let contextSvg: string | undefined;

      // First set contextSvg
      editor.command(SetCursor, { contextSvg: "<svg>original</svg>" });
      await editor.tick();

      // Then set only svg
      editor.command(SetCursor, { svg: "<svg>base</svg>" });
      await editor.tick();

      editor.nextTick((ctx) => {
        contextSvg = Cursor.read(ctx).contextSvg;
      });

      await editor.tick();
      expect(contextSvg).toBe("<svg>original</svg>");
    });
  });
});
