---
title: WovenCanvas
description: API reference for the WovenCanvas component
---

The main canvas component that provides a fully-featured infinite canvas.

## Import

```typescript
import { WovenCanvas } from "@woven-canvas/vue";
import "@woven-canvas/vue/style.css";
```

## Props

```typescript
interface WovenCanvasProps {
  store?: {
    // persistence, history, and multiplayer
    persistence?: {
      documentId: string; // unique ID for IndexedDB persistence
    };
    history?: // default: true (undo/redo enabled)
      | true // use defaults
      | {
          commitCheckpointAfterFrames?: number; // optional
          maxHistoryStackSize?: number; // optional
        };
    websocket?: {
      documentId: string; // document ID for multiplayer sync
      url: string; // WebSocket server URL
      clientId: string; // unique client identifier
      startOffline?: boolean; // default: false
      token?: string; // optional — authentication token
      onVersionMismatch?: (serverVersion: number) => void;
      onConnectivityChange?: (isOnline: boolean) => void;
    };
    initialState?: Record<string, ComponentData>; // optional — seed data
  };

  editor?: {
    // optional — editor configuration
    maxEntities?: number; // default: 5000
    user?: UserDataInput; // optional — user identity for presence
    blockDefs?: BlockDefInput[]; // optional — custom block definitions
    keybinds?: Keybind[]; // optional — additional keyboard shortcuts
    cursors?: Record<string, CursorDef>; // optional — custom cursor definitions
    components?: AnyCanvasComponentDef[]; // optional — custom components
    singletons?: AnyCanvasSingletonDef[]; // optional — custom singletons
    systems?: EditorSystem[]; // optional — custom systems
    plugins?: EditorPluginInput[]; // optional — additional plugins
    fonts?: FontFamilyInput[]; // optional — custom fonts to load
    grid?: {
      enabled?: boolean; // default: true
      strict?: boolean; // default: false — always snap, not just while dragging
      colWidth?: number; // default: 20
      rowHeight?: number; // default: 20
      snapAngleRad?: number; // default: Math.PI / 36 (5°)
      shiftSnapAngleRad?: number; // default: Math.PI / 12 (15°)
    };
    controls?: ControlsOptionsInput; // optional — initial controls config
    omitPluginKeybinds?: boolean; // default: false
    omitPluginCursors?: boolean; // default: false
    omitPluginFonts?: boolean; // default: false
  };

  background?: {
    // optional — no background if omitted
    kind: "grid" | "dots" | "none"; // background pattern type
    color: string; // background fill color
    strokeColor: string; // stroke color for lines or dots
    subdivisionStep: number; // number of subdivisions
    dotSize?: number; // default: 2 — dot size (when kind is "dots")
    gridSize?: number; // default: 1 — line width (when kind is "grid")
  };

  assetProvider?: AssetProvider; // default: LocalAssetProvider

  pluginOptions?: {
    // default: all plugins enabled — pass false to disable
    controls?:
      | {
          // pan/zoom controls
          minZoom?: number; // default: 0.05
          maxZoom?: number; // default: 2.7
          smoothScroll?: {
            enabled?: boolean; // default: true
            time?: number; // default: 0.12 (seconds)
          };
          smoothZoom?: {
            enabled?: boolean; // default: true
            time?: number; // default: 0.12 (seconds)
          };
          cameraBounds?: {
            // optional — restrict camera to bounds
            top: number;
            bottom: number;
            left: number;
            right: number;
            restrict?: "edges" | "center"; // default: "edges"
          };
        }
      | false;
    selection?:
      | {
          // selection and transform
          edgeScrolling?: {
            enabled?: boolean; // default: true
            edgeSizePx?: number; // default: 10
            edgeScrollSpeedPxPerFrame?: number; // default: 15
            edgeScrollDelayMs?: number; // default: 250
          };
        }
      | false;
    eraser?:
      | {
          tailRadius?: number; // optional — eraser trail radius
          tailLength?: number; // optional — eraser trail length
        }
      | false;
    pen?: false; // pass false to disable (no options)
    arrows?:
      | {
          elbowArrowPadding?: number; // default: 50 — padding for elbow arrow routing
        }
      | false;
  };

  controls?: ControlsOptionsInput; // optional — initial tool mappings

  // JSON-serialized BlockSnapshot — controls what block is created on double-click.
  // Defaults to a text block. Set to "" to disable.
  // Shape: { block: { tag: string; size?: [number, number] }, ...componentData }
  doubleClickSnapshot?: string;

  copyPaste?: {
    enabled?: boolean; // default: true — whether copy/paste is enabled
    canPasteTextAsBlock?: boolean; // default: true — paste external text as a text block
  };

  // Initial state for SSR pre-rendering. When provided, the editor is
  // created headlessly during setup so blocks render in server-side HTML.
  initialState?: Record<string, ComponentData>;
}
```

## Events

```typescript
interface WovenCanvasEvents {
  // Emitted when initialization completes
  ready: [editor: Editor, store: CanvasStore];
}
```

## Slots

### Block Slots

Override rendering for any block type:

```vue
<template #block:sticky-note="props">
  <MyCustomStickyNote v-bind="props" />
</template>
```

Slot props:

```typescript
interface BlockData {
  entityId: number;
  block: {
    tag: string;
    position: [number, number];
    size: [number, number];
    rank: string;
    rotateZ: number;
    flip: [boolean, boolean];
  };
  stratum: "background" | "content" | "overlay";
  selected: boolean;
  hovered: boolean;
  edited: boolean;
  held: { sessionId: string } | null;
  opacity: { value: number } | null;
  connector:
    | {
        /* ... */
      }
    | null;
}
```

### Toolbar Slot

The `toolbar` slot replaces the entire toolbar. To customize which tools appear, pass your own tool components as children to the built-in `Toolbar`:

```vue
<!-- Replace entirely -->
<template #toolbar>
  <MyCustomToolbar />
</template>

<!-- Customize which tools appear (uses built-in toolbar chrome) -->
<template #toolbar>
  <Toolbar>
    <SelectTool />
    <HandTool />
    <TextTool />
    <!-- only these three tools will appear -->
  </Toolbar>
</template>
```

The built-in tool components are exported from `@woven-canvas/vue`:

`SelectTool`, `HandTool`, `TextTool`, `ImageTool`, `EmbedTool`, `ShapeTool`, `ElbowArrowTool`, `StickyNoteTool`, `TapeTool`, `PenTool`, `EraserTool`

### Floating Menu Slot

The `floating-menu` slot replaces the content inside the floating menu (the popup that appears when blocks are selected). To override individual buttons, use `FloatingMenuBar` with `button:*` slots:

```vue
<!-- Replace entirely -->
<template #floating-menu>
  <MyCustomMenu />
</template>

<!-- Override specific buttons -->
<template #floating-menu>
  <FloatingMenuBar>
    <!-- Override the color button -->
    <template #button:color="{ entityIds }">
      <MyColorPicker :entity-ids="entityIds" />
    </template>

    <!-- Add a button for a custom component -->
    <template #button:myComponent="{ entityIds }">
      <MyComponentButton :entity-ids="entityIds" />
    </template>
  </FloatingMenuBar>
</template>
```

Built-in button slots (shown when the selected blocks have the corresponding component):

```typescript
// Each slot receives { entityIds: number[] }
interface FloatingMenuButtonSlots {
  "button:color": {}; // color picker
  "button:text": {}; // text formatting (bold, italic, font, size, etc.)
  "button:shape": {}; // shape kind, fill color, stroke
  "button:penStroke": {}; // pen stroke thickness
  "button:arrowThickness": {}; // arrow line thickness
  "button:arrowHeadStart": {}; // arrow start head style
  "button:arrowHeadEnd": {}; // arrow end head style
  "button:tape": {}; // tape image picker
  "button:<componentName>": {}; // custom components — auto-shown when common to selection
}
```

### Other UI Slots

```typescript
interface UISlots {
  background: {
    // replace the background
    background: BackgroundOptions;
  };
  "user-presence": {
    // replace user avatars
    users: UserData[];
  };
  "user-cursors": {
    // replace user cursors
    users: UserData[];
    currentSessionId: string;
    camera: { left: number; top: number; zoom: number };
  };
  "offline-indicator": {
    // replace offline indicator
    isOnline: boolean;
  };
  "version-mismatch": {
    // replace version warning
    versionMismatch: boolean;
  };
  "back-to-content": {}; // replace "back to content" button
  loading: {
    // replace loading overlay
    isLoading: boolean;
  };
}
```

## Example

```vue
<script setup lang="ts">
import { WovenCanvas, type Editor } from "@woven-canvas/vue";
import type { CanvasStore } from "@woven-ecs/canvas-store";

const storeOptions = {
  persistence: { documentId: "my-canvas" },
};

function onReady(editor: Editor, store: CanvasStore) {
  console.log("Canvas ready!");
}
</script>

<template>
  <WovenCanvas
    :store="storeOptions"
    :editor="{ grid: { enabled: true } }"
    :plugin-options="{ controls: { maxZoom: 5 } }"
    :background="{ kind: 'dots' }"
    @ready="onReady"
  >
    <template #block:my-block="props">
      <MyBlock v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

### Disabling Built-in Plugins

```vue
<template>
  <WovenCanvas
    :plugin-options="{
      pen: false,
      eraser: false,
      arrows: false,
    }"
  />
</template>
```
