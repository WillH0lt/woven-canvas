import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  hasComponent,
  defineQuery,
  type EditorPlugin,
  Controls,
  Block,
  Opacity,
  Edited,
  createEntity,
  type EntityId,
} from "@infinitecanvas/core";
import {
  TransformBox,
  TransformHandle,
  DragStart,
  Selected,
} from "../../../src/components";
import {
  TransformBoxStateSingleton,
  SelectionStateSingleton,
} from "../../../src/singletons";
import { transformBoxSystem } from "../../../src/systems/postUpdate";
import {
  AddTransformBox,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
  StartTransformBoxEdit,
  EndTransformBoxEdit,
} from "../../../src/commands";
import { TransformHandleKind } from "../../../src/types";
import { PLUGIN_NAME } from "../../../src/constants";
import { createBlock } from "../../testUtils";
import { CURSORS } from "../../../src/cursors";

// Define queries at module level
const transformBoxQuery = defineQuery((q) => q.with(Block, TransformBox));
const transformHandleQuery = defineQuery((q) => q.with(Block, TransformHandle));

// Test plugin with UpdateTransformBox system
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  cursors: CURSORS,
  blockDefs: [
    {
      tag: "text",
      editOptions: { canEdit: true },
      resizeMode: "text",
    },
    {
      tag: "image",
      resizeMode: "scale",
      canRotate: true,
      canScale: true,
    },
    {
      tag: "noRotate",
      canRotate: false,
      canScale: true,
    },
    {
      tag: "noScale",
      canRotate: true,
      canScale: false,
    },
    {
      tag: "groupOnly",
      resizeMode: "groupOnly",
    },
  ],
  components: [
    Selected,
    TransformBox,
    TransformHandle,
    DragStart,
  ],
  singletons: [
    TransformBoxStateSingleton,
    SelectionStateSingleton,
  ],
  systems: [transformBoxSystem],
  setup(ctx) {
    const controls = Controls.write(ctx);
    controls.leftMouseTool = "select";
  },
};

describe("PostUpdateTransformBox", () => {
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

  describe("AddTransformBox command", () => {
    it("should create a transform box when command is spawned", async () => {
      let transformBoxCount = 0;
      let transformBoxId: EntityId = 0;

      // Create and select a block
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
        // Create entity for transform box (like capture system does)
        transformBoxId = createEntity(ctx);
      });

      await editor.tick();

      // Spawn the command
      editor.nextTick((ctx) => {
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check that transform box was created
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        transformBoxCount = transformBoxes.length;
      });

      await editor.tick();
      expect(transformBoxCount).toBe(1);
    });

    it("should create transform handles for selected block", async () => {
      let handleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create and select a block
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "image" });
        transformBoxId = createEntity(ctx);
      });

      await editor.tick();

      // Spawn the command
      editor.nextTick((ctx) => {
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check handle count
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        handleCount = handles.length;
      });

      await editor.tick();
      // Should have corner scale handles (4) + rotation handles (4) + edge handles (4)
      expect(handleCount).toBeGreaterThan(0);
    });

    it("should size transform box to match selected block bounds", async () => {
      let boxPosition: [number, number] = [0, 0];
      let boxSize: [number, number] = [0, 0];
      let transformBoxId: EntityId = 0;

      // Create and select a block with specific position/size
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [50, 75],
          size: [200, 150],
          selected: true,
        });
        transformBoxId = createEntity(ctx);
      });

      await editor.tick();

      // Spawn the command
      editor.nextTick((ctx) => {
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check transform box bounds
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        if (transformBoxes.length > 0) {
          const block = Block.read(ctx, transformBoxes[0]);
          boxPosition = [...block.position] as [number, number];
          boxSize = [...block.size] as [number, number];
        }
      });

      await editor.tick();
      expect(boxPosition).toEqual([50, 75]);
      expect(boxSize).toEqual([200, 150]);
    });

    it("should encompass multiple selected blocks", async () => {
      let boxPosition: [number, number] = [0, 0];
      let boxSize: [number, number] = [0, 0];
      let transformBoxId: EntityId = 0;

      // Create and select two blocks
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          selected: true,
        });
        createBlock(ctx, {
          position: [200, 150],
          size: [100, 100],
          selected: true,
        });
        transformBoxId = createEntity(ctx);
      });

      await editor.tick();

      // Spawn the command
      editor.nextTick((ctx) => {
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check transform box encompasses both blocks
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        if (transformBoxes.length > 0) {
          const block = Block.read(ctx, transformBoxes[0]);
          boxPosition = [...block.position] as [number, number];
          boxSize = [...block.size] as [number, number];
        }
      });

      await editor.tick();
      // Should span from (0,0) to (300,250)
      expect(boxPosition).toEqual([0, 0]);
      expect(boxSize).toEqual([300, 250]);
    });
  });

  describe("RemoveTransformBox command", () => {
    it("should remove transform box and handles", async () => {
      let transformBoxCount = 0;
      let handleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create block, select it, and create transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Remove transform box
      editor.nextTick((ctx) => {
        RemoveTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check counts
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        const handles = transformHandleQuery.current(ctx);
        transformBoxCount = transformBoxes.length;
        handleCount = handles.length;
      });

      await editor.tick();
      expect(transformBoxCount).toBe(0);
      expect(handleCount).toBe(0);
    });
  });

  describe("HideTransformBox command", () => {
    it("should add Opacity component with value 0 to transform box", async () => {
      let hasOpacity = false;
      let opacityValue = 1;
      let transformBoxId: EntityId = 0;

      // Create transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Hide transform box
      editor.nextTick((ctx) => {
        HideTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check opacity
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        if (transformBoxes.length > 0) {
          hasOpacity = hasComponent(ctx, transformBoxes[0], Opacity);
          if (hasOpacity) {
            opacityValue = Opacity.read(ctx, transformBoxes[0]).value;
          }
        }
      });

      await editor.tick();
      expect(hasOpacity).toBe(true);
      expect(opacityValue).toBe(0);
    });

    it("should hide all handles", async () => {
      let allHandlesHidden = false;
      let transformBoxId: EntityId = 0;

      // Create transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "image" });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Hide transform box
      editor.nextTick((ctx) => {
        HideTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check all handles have opacity 0
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        allHandlesHidden =
          handles.length > 0 &&
          handles.every((id) => {
            if (!hasComponent(ctx, id, Opacity)) return false;
            return Opacity.read(ctx, id).value === 0;
          });
      });

      await editor.tick();
      expect(allHandlesHidden).toBe(true);
    });
  });

  describe("ShowTransformBox command", () => {
    it("should remove Opacity component from transform box", async () => {
      let hasOpacity = true;
      let transformBoxId: EntityId = 0;

      // Create and hide transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        HideTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Show transform box
      editor.nextTick((ctx) => {
        ShowTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check opacity removed
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx);
        if (transformBoxes.length > 0) {
          hasOpacity = hasComponent(ctx, transformBoxes[0], Opacity);
        }
      });

      await editor.tick();
      expect(hasOpacity).toBe(false);
    });
  });

  describe("StartTransformBoxEdit command", () => {
    it("should add Edited component to selected blocks", async () => {
      let blockId: number | undefined;
      let hasEdited = false;
      let transformBoxId: EntityId = 0;

      // Create and select block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Start edit
      editor.nextTick((ctx) => {
        StartTransformBoxEdit.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check edited
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasEdited = hasComponent(ctx, blockId, Edited);
        }
      });

      await editor.tick();
      expect(hasEdited).toBe(true);
    });

    it("should remove handles during edit", async () => {
      let handleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "image" });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Start edit
      editor.nextTick((ctx) => {
        StartTransformBoxEdit.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check handles removed
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        handleCount = handles.length;
      });

      await editor.tick();
      expect(handleCount).toBe(0);
    });
  });

  describe("EndTransformBoxEdit command", () => {
    it("should remove Edited component from blocks", async () => {
      let blockId: number | undefined;
      let hasEdited = true;
      let transformBoxId: EntityId = 0;

      // Create, edit, then end edit
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        StartTransformBoxEdit.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      editor.nextTick((ctx) => {
        EndTransformBoxEdit.spawn(ctx, undefined);
      });

      await editor.tick();

      // Check edited removed
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasEdited = hasComponent(ctx, blockId, Edited);
        }
      });

      await editor.tick();
      expect(hasEdited).toBe(false);
    });
  });

  describe("handle creation based on blockDefs", () => {
    it("should not create rotation handles when canRotate is false", async () => {
      let rotationHandleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create block with canRotate: false
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "noRotate" });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Count rotation handles
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        rotationHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id);
          return handle.kind === TransformHandleKind.Rotate;
        }).length;
      });

      await editor.tick();
      expect(rotationHandleCount).toBe(0);
    });

    it("should not create scale handles when canScale is false", async () => {
      let scaleHandleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create block with canScale: false
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "noScale" });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Count scale handles
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        scaleHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id);
          return handle.kind === TransformHandleKind.Scale;
        }).length;
      });

      await editor.tick();
      expect(scaleHandleCount).toBe(0);
    });

    it("should create stretch handles for left/right edges when resizeMode is text", async () => {
      let stretchHandleCount = 0;
      let transformBoxId: EntityId = 0;

      // Create block with resizeMode: text
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: "text" });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Count stretch handles (should be left/right edges)
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx);
        stretchHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id);
          return (
            handle.kind === TransformHandleKind.Stretch && handle.vectorY === 0 // Left/right edge handles
          );
        }).length;
      });

      await editor.tick();
      // Should have 2 stretch handles (left and right edges)
      expect(stretchHandleCount).toBe(2);
    });
  });

  describe("DragStart component", () => {
    it("should add DragStart to selected blocks", async () => {
      let blockId: number | undefined;
      let hasDragStart = false;
      let transformBoxId: EntityId = 0;

      // Create and select block
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check DragStart
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasDragStart = hasComponent(ctx, blockId, DragStart);
        }
      });

      await editor.tick();
      expect(hasDragStart).toBe(true);
    });

    it("should set DragStart position to match block position", async () => {
      let blockId: number | undefined;
      let dragStartPosition: [number, number] = [0, 0];
      let transformBoxId: EntityId = 0;

      // Create block at specific position
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [123, 456],
          selected: true,
        });
        transformBoxId = createEntity(ctx);
        AddTransformBox.spawn(ctx, { transformBoxId });
      });

      await editor.tick();

      // Check DragStart position
      editor.nextTick((ctx) => {
        if (blockId !== undefined && hasComponent(ctx, blockId, DragStart)) {
          const dragStart = DragStart.read(ctx, blockId);
          dragStartPosition = [...dragStart.position] as [number, number];
        }
      });

      await editor.tick();
      expect(dragStartPosition).toEqual([123, 456]);
    });
  });
});
