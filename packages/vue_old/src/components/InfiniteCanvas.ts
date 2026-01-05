import {
  defineComponent,
  ref,
  shallowRef,
  onMounted,
  onUnmounted,
  h,
  type PropType,
  type VNode,
} from "vue";
import {
  Editor as EditorCore,
  Camera,
  defineQuery,
  hasComponent,
  Block,
  Selected,
  Hovered,
  Edited,
  type EditorPluginInput,
  type EntityId,
} from "@infinitecanvas/editor";
import { InfiniteCanvasPlugin } from "@infinitecanvas/plugin-selection";
import {
  CanvasControlsPlugin,
  type CanvasControlsOptions,
} from "@infinitecanvas/plugin-canvas-controls";

/** Block data passed to slots */
export interface BlockSlotProps {
  block: {
    tag: string;
    position: [number, number];
    size: [number, number];
    rotateZ: number;
    rank: string;
  };
  entityId: EntityId;
  selected: boolean;
  hovered: boolean;
  editing: boolean;
}

/** Query for all blocks */
const blockQuery = defineQuery((q) => q.with(Block));

export const InfiniteCanvas = defineComponent({
  name: "InfiniteCanvas",
  props: {
    controls: {
      type: Object as PropType<CanvasControlsOptions>,
      default: () => ({}),
    },
    plugins: {
      type: Array as PropType<EditorPluginInput[]>,
      default: () => [],
    },
  },
  emits: {
    ready: (editor: EditorCore) => true,
  },
  setup(props, { emit, slots }) {
    const containerRef = ref<HTMLDivElement | null>(null);
    const editorRef = shallowRef<EditorCore | null>(null);
    const blocksRef = shallowRef<BlockSlotProps[]>([]);
    const cameraRef = shallowRef({ left: 0, top: 0, zoom: 1 });

    let animationFrameId: number | null = null;

    function tick() {
      const editor = editorRef.value;
      if (editor) {
        editor.tick();
        updateBlocks(editor);
        updateCamera(editor);
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    function updateBlocks(editor: EditorCore) {
      const ctx = editor._getContext();
      const blocks: BlockSlotProps[] = [];

      for (const entityId of blockQuery.current(ctx)) {
        const blockData = Block.read(ctx, entityId);
        blocks.push({
          block: {
            tag: blockData.tag,
            position: [...blockData.position] as [number, number],
            size: [...blockData.size] as [number, number],
            rotateZ: blockData.rotateZ,
            rank: blockData.rank,
          },
          entityId,
          selected: hasComponent(ctx, entityId, Selected),
          hovered: hasComponent(ctx, entityId, Hovered),
          editing: hasComponent(ctx, entityId, Edited),
        });
      }

      // Sort by rank for z-ordering
      blocks.sort((a, b) => (a.block.rank > b.block.rank ? 1 : -1));

      blocksRef.value = blocks;
    }

    function updateCamera(editor: EditorCore) {
      const ctx = editor._getContext();
      const camera = Camera.read(ctx);
      cameraRef.value = {
        left: camera.left,
        top: camera.top,
        zoom: camera.zoom,
      };
    }

    onMounted(async () => {
      if (!containerRef.value) return;

      // Build plugins array
      const allPlugins: EditorPluginInput[] = [
        CanvasControlsPlugin(props.controls),
        InfiniteCanvasPlugin,
        ...props.plugins,
      ];

      const editor = new EditorCore(containerRef.value, {
        plugins: allPlugins,
      });

      await editor.initialize();

      editorRef.value = editor;
      emit("ready", editor);

      animationFrameId = requestAnimationFrame(tick);
    });

    onUnmounted(() => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (editorRef.value) {
        editorRef.value.dispose();
        editorRef.value = null;
      }
    });

    function getBlockStyle(block: BlockSlotProps["block"]) {
      const camera = cameraRef.value;
      const screenX = (block.position[0] - camera.left) * camera.zoom;
      const screenY = (block.position[1] - camera.top) * camera.zoom;
      const screenWidth = block.size[0] * camera.zoom;
      const screenHeight = block.size[1] * camera.zoom;

      return {
        position: "absolute" as const,
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        transform:
          block.rotateZ !== 0 ? `rotate(${block.rotateZ}rad)` : undefined,
        transformOrigin: "center center",
        pointerEvents: "auto" as const,
      };
    }

    return () => {
      const blockNodes: VNode[] = [];

      for (const blockProps of blocksRef.value) {
        const { block } = blockProps;
        const slotName = block.tag;

        // Try tag-specific slot first, otherwise skip (no fallback for MVP)
        const slotFn = slots[slotName];
        if (slotFn) {
          blockNodes.push(
            h(
              "div",
              {
                key: blockProps.entityId,
                class: "infinite-canvas-block",
                style: getBlockStyle(block),
                "data-entity-id": blockProps.entityId,
              },
              slotFn(blockProps)
            )
          );
        }
      }

      return h(
        "div",
        {
          ref: containerRef,
          class: "infinite-canvas",
          style: {
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          },
        },
        [
          // Blocks layer
          h(
            "div",
            {
              class: "infinite-canvas-blocks",
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              },
            },
            blockNodes
          ),
        ]
      );
    };
  },
});
