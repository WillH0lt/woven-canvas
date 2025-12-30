import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  removeComponent,
  type EditorPlugin,
  Controls,
} from "@infinitecanvas/editor";
import {
  Block,
  Aabb,
  Selected,
  Hovered,
  TransformBox,
  TransformHandle,
} from "../../../src/components";
import { selectBlock } from "../../../src/helpers";
import {
  Intersect,
  RankBounds,
  TransformBoxStateSingleton,
} from "../../../src/singletons";
import { transformBoxSystem } from "../../../src/systems/capture";
import {
  AddOrUpdateTransformBox,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
} from "../../../src/commands";
import { TransformBoxState, BlockDef } from "../../../src/types";
import { PLUGIN_NAME } from "../../../src/constants";
import type { InfiniteCanvasResources } from "../../../src/InfiniteCanvasPlugin";
import {
  createPointerSimulator,
  simulateMouseMove,
  createBlock,
  createTestResources,
} from "../../testUtils";

// Pointer simulator for consistent pointer events
const pointer = createPointerSimulator();

// Test plugin with only CaptureTransformBox system - no selection flow dependencies
const testPlugin: EditorPlugin<InfiniteCanvasResources> = {
  name: PLUGIN_NAME,
  resources: createTestResources({
    blockDefs: {
      text: BlockDef.parse({
        tag: "text",
        editOptions: { canEdit: true },
        resizeMode: "text",
      }),
    },
  }),
  components: [Block, Aabb, Selected, Hovered, TransformBox, TransformHandle],
  singletons: [Intersect, RankBounds, TransformBoxStateSingleton],
  captureSystems: [transformBoxSystem],
  setup(ctx) {
    // Set up select tool on left mouse button
    const controls = Controls.write(ctx);
    controls.leftMouseTool = "select";
  },
};

describe("CaptureTransformBox", () => {
  let editor: Editor;
  let domElement: HTMLDivElement;

  beforeEach(async () => {
    // Create a fresh DOM element for each test to ensure clean listener state
    domElement = document.createElement("div");
    document.body.appendChild(domElement);

    pointer.reset();
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

  describe("state machine initialization", () => {
    it("should start in None state", async () => {
      let state: string | undefined;

      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.None);
    });
  });

  describe("selection changes", () => {
    it("should transition to Idle when a block is selected", async () => {
      let state: string | undefined;
      let entityId: number | undefined;

      // Create a block (not selected)
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      // Directly add Selected component to simulate selection
      editor.nextTick((ctx) => {
        selectBlock(ctx, entityId!);
      });

      await editor.tick();

      // CaptureTransformBox should detect the selection change via query tracking
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);
    });

    it("should spawn AddOrUpdateTransformBox when selection is added", async () => {
      let commandSpawned = false;
      let entityId: number | undefined;

      // Create a block (not selected)
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false });
      });

      await editor.tick();

      // Directly add Selected component
      editor.nextTick((ctx) => {
        selectBlock(ctx, entityId!);
      });

      await editor.tick();

      // Check if command was spawned
      editor.nextTick((ctx) => {
        commandSpawned = AddOrUpdateTransformBox.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(commandSpawned).toBe(true);
    });

    it("should transition back to None when selection is cleared", async () => {
      let state: string | undefined;
      let entityId: number | undefined;

      // Create and select a block
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true });
      });

      await editor.tick();

      // Verify it's in Idle state
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });
      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);

      // Remove selection
      editor.nextTick((ctx) => {
        removeComponent(ctx, entityId!, Selected);
      });

      await editor.tick();

      // Check the transform box state is back to None
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.None);
    });

    it("should spawn RemoveTransformBox when selection is cleared", async () => {
      let commandSpawned = false;
      let entityId: number | undefined;

      // Create and select a block
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true });
      });

      await editor.tick();

      // Remove selection
      editor.nextTick((ctx) => {
        removeComponent(ctx, entityId!, Selected);
      });

      await editor.tick();

      // Check if RemoveTransformBox command was spawned
      editor.nextTick((ctx) => {
        commandSpawned = RemoveTransformBox.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(commandSpawned).toBe(true);
    });
  });

  describe("pointer interactions in Idle state", () => {
    it("should spawn HideTransformBox on pointerDown", async () => {
      let commandSpawned = false;

      // Create and select a block
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
      });

      await editor.tick();

      // Pointer down
      simulateMouseMove(150, 150);
      pointer.pointerDown(domElement, 150, 150);
      await editor.tick();

      // Check if HideTransformBox command was spawned
      editor.nextTick((ctx) => {
        commandSpawned = HideTransformBox.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(commandSpawned).toBe(true);
    });

    it("should spawn ShowTransformBox on pointerUp", async () => {
      let commandSpawned = false;

      // Create and select a block
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true });
      });

      await editor.tick();

      // Pointer down then up
      simulateMouseMove(150, 150);
      pointer.pointerDown(domElement, 150, 150);
      await editor.tick();

      pointer.pointerUp(150, 150);
      await editor.tick();

      // Check if ShowTransformBox command was spawned
      editor.nextTick((ctx) => {
        commandSpawned = ShowTransformBox.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(commandSpawned).toBe(true);
    });
  });

  describe("multi-selection", () => {
    it("should transition to Idle with multiple blocks selected", async () => {
      let state: string | undefined;

      // Create and select two blocks
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          rank: "a",
          selected: true,
        });
        createBlock(ctx, {
          position: [200, 100],
          size: [50, 50],
          rank: "b",
          selected: true,
        });
      });

      await editor.tick();

      // Check the transform box state
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);
    });

    it("should update transform box when adding to selection", async () => {
      let state: string | undefined;
      let entity2: number | undefined;

      // Create two blocks, select only the first
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          rank: "a",
          selected: true,
        });
        entity2 = createBlock(ctx, {
          position: [200, 100],
          size: [50, 50],
          rank: "b",
          selected: false,
        });
      });

      await editor.tick();

      // Verify it's in Idle state
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });
      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);

      // Add second block to selection
      editor.nextTick((ctx) => {
        selectBlock(ctx, entity2!);
      });

      await editor.tick();

      // Still in Idle state
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);
    });
  });

  describe("editing state", () => {
    it("should transition to Editing when clicking transform box with editable block", async () => {
      let state: string | undefined;
      let transformBoxEntityId: number | undefined;

      // Create and select a block with a tag (editable)
      editor.nextTick((ctx) => {
        createBlock(ctx, { tag: "text", selected: true });
      });

      await editor.tick();

      // Verify it's in Idle state
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });
      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);

      // Create a transform box entity that will be intersected
      editor.nextTick((ctx) => {
        transformBoxEntityId = createEntity(ctx);
        addComponent(ctx, transformBoxEntityId, TransformBox, {});
        addComponent(ctx, transformBoxEntityId, Block, {
          position: [95, 95],
          size: [110, 110],
          rank: "z",
        });
        addComponent(ctx, transformBoxEntityId, Aabb, {});
        // Add to intersect list so click handler sees it
        Intersect.setAll(ctx, [transformBoxEntityId]);
      });

      await editor.tick();

      // Simulate a click event on the transform box
      simulateMouseMove(150, 150);
      pointer.pointerDown(domElement, 150, 150);
      await editor.tick();

      pointer.pointerUp(150, 150);
      await editor.tick();

      // Check the transform box state - should transition to Editing
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.Editing);
    });
  });

  describe("non-editable blocks", () => {
    it("should not transition to Editing when block has no tag", async () => {
      let state: string | undefined;
      let transformBoxEntityId: number | undefined;

      // Create and select a block without a tag (not editable)
      editor.nextTick((ctx) => {
        createBlock(ctx, { tag: "", selected: true });
      });

      await editor.tick();

      // Create transform box entity
      editor.nextTick((ctx) => {
        transformBoxEntityId = createEntity(ctx);
        addComponent(ctx, transformBoxEntityId, TransformBox, {});
        addComponent(ctx, transformBoxEntityId, Block, {
          position: [95, 95],
          size: [110, 110],
          rank: "z",
        });
        addComponent(ctx, transformBoxEntityId, Aabb, {});
        Intersect.setAll(ctx, [transformBoxEntityId]);
      });

      await editor.tick();

      // Click on transform box
      simulateMouseMove(150, 150);
      pointer.pointerDown(domElement, 150, 150);
      await editor.tick();

      pointer.pointerUp(150, 150);
      await editor.tick();

      // Check the transform box state - should stay in Idle, not Editing
      editor.nextTick((ctx) => {
        state = TransformBoxStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(TransformBoxState.Idle);
    });
  });
});
