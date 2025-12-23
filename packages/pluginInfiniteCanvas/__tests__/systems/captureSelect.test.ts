import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  Editor,
  createEntity,
  addComponent,
  hasComponent,
  type EditorPlugin,
  Controls,
} from "@infinitecanvas/editor";
import {
  Block,
  Aabb,
  Selected,
  Locked,
  Hovered,
} from "../../src/components";
import {
  Intersect,
  RankBounds,
  SelectionStateSingleton,
} from "../../src/singletons";
import { CaptureSelect } from "../../src/systems";
import { DeselectAll } from "../../src/commands";
import { SelectionState } from "../../src/types";
import {
  createPointerSimulator,
  createBlock,
  simulateMouseMove,
  simulateKeyDown,
} from "../testUtils";

// Pointer simulator for consistent pointer events
const pointer = createPointerSimulator();

// Factory function to create test plugin
const testPlugin: EditorPlugin = {
  name: "test",
  components: [Block, Aabb, Selected, Locked, Hovered],
  singletons: [Intersect, RankBounds, SelectionStateSingleton],
  captureSystems: [CaptureSelect],
  setup(ctx) {
    // Set up select tool on left mouse button
    const controls = Controls.write(ctx);
    controls.leftMouseTool = "select";
  },
};

describe("selectCaptureSystem", () => {
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
    it("should start in Idle state", async () => {
      let state: string | undefined;

      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(SelectionState.Idle);
    });
  });

  describe("selection box on empty space", () => {
    it("should transition to SelectionBoxPointing when clicking on empty space", async () => {
      let state: string | undefined;

      // Mouse down on empty space (no blocks)
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(SelectionState.SelectionBoxPointing);
    });

    it("should transition to SelectionBoxDragging when dragging on empty space", async () => {
      let state: string | undefined;

      // Mouse down on empty space
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      // Drag beyond threshold
      pointer.pointerMove(60, 60);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(SelectionState.SelectionBoxDragging);
    });

    it("should return to Idle when releasing selection box", async () => {
      let state: string | undefined;

      // Mouse down on empty space
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      // Drag beyond threshold
      pointer.pointerMove(60, 60);
      await editor.tick();

      // Release
      pointer.pointerUp(60, 60);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(SelectionState.Idle);
    });

    it("should return to Idle on click without drag", async () => {
      let state: string | undefined;

      // Mouse down on empty space
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      // Release without dragging
      pointer.pointerUp(50, 50);
      await editor.tick();

      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });

      await editor.tick();
      expect(state).toBe(SelectionState.Idle);
    });
  });

  describe("block selection", () => {
    it("should transition to Pointing state when clicking on a block", async () => {
      // This test verifies that the isOverBlock guard correctly identifies
      // a block is under the cursor when intersects array has entries.
      // This confirms the fix for the bug where `intersects[0] !== 0`
      // would incorrectly reject entity ID 0.
      let state: string | undefined;
      let entityId: number | undefined;

      // Create a persistent block and set up intersect
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { position: [0, 0], size: [100, 100] });
        Intersect.setAll(ctx, [entityId]);
      });
      await editor.tick();

      // Set intersect before pointer down
      editor.nextTick((ctx) => {
        Intersect.setAll(ctx, [entityId!]);
      });
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      // Check state - should be Pointing (not SelectionBoxPointing)
      editor.nextTick((ctx) => {
        state = SelectionStateSingleton.read(ctx).state;
      });
      await editor.tick();

      // If isOverBlock guard works, we should be in Pointing state
      // The old bug with `intersects[0] !== 0` would put us in SelectionBoxPointing
      expect(state).toBe(SelectionState.Pointing);
    });
  });

  describe("non-persistent blocks", () => {
    it("should not select non-persistent blocks on click", async () => {
      let entityId: number | undefined;
      let isSelected = false;

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx);
        addComponent(ctx, entityId, Block, {
          position: [0, 0],
          size: [100, 100],
          rank: "a",
        });
        // Note: No Persistent component added
      });

      await editor.tick();

      // Move and click on block
      simulateMouseMove(50, 50);
      pointer.pointerDown(domElement, 50, 50);
      await editor.tick();

      pointer.pointerUp(50, 50);
      await editor.tick();

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected);
      });

      await editor.tick();
      // Non-persistent blocks should not be selectable
      expect(isSelected).toBe(false);
    });
  });

  describe("deselection", () => {
    it("should spawn DeselectAll command when clicking empty space", async () => {
      let deselectAllSpawned = false;

      // Click on empty space
      simulateMouseMove(300, 300);
      pointer.pointerDown(domElement, 300, 300);
      await editor.tick();

      // Check if command was spawned last frame using nextTick
      editor.nextTick((ctx) => {
        deselectAllSpawned = DeselectAll.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(deselectAllSpawned).toBe(true);
    });

    it("should NOT spawn DeselectAll command when shift is held", async () => {
      let deselectAllSpawned = false;

      // Simulate shift key down using real DOM event
      simulateKeyDown(domElement, "ShiftLeft", { shiftKey: true });
      await editor.tick();

      // Click on empty space while shift is held
      simulateMouseMove(300, 300);
      pointer.pointerDown(domElement, 300, 300);
      await editor.tick();

      // Check if command was spawned last frame
      editor.nextTick((ctx) => {
        deselectAllSpawned = DeselectAll.didSpawnLastFrame(ctx);
      });

      await editor.tick();
      expect(deselectAllSpawned).toBe(false);
    });
  });
});
