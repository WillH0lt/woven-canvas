---
title: Composables
description: Vue composables for reactive ECS data
---

Woven Canvas provides Vue composables to reactively access ECS data from within your components.

## useEditorContext

Access the editor instance and helper functions:

```typescript
import { useEditorContext } from "@woven-canvas/vue";

const {
  getEditor, // () => Editor | null
  getAssetManager, // () => AssetManager | null
  getSessionId, // () => string
  nextEditorTick, // (callback: (ctx: Context) => void) => void
} = useEditorContext();

// Execute code in the next ECS tick
nextEditorTick((ctx) => {
  // ctx is the ECS context - read/write components here
});
```

## useComponent

Subscribe to a single component on an entity:

```typescript
import { useComponent } from "@woven-canvas/vue";
import { Color } from "@woven-canvas/core";

const props = defineProps<{ entityId: number }>();

// Returns Ref<ColorData | null>
const color = useComponent(props.entityId, Color);

// Reactively access component data
watchEffect(() => {
  if (color.value) {
    console.log("Color:", color.value.red, color.value.green, color.value.blue);
  }
});
```

## useComponents

Subscribe to a component on multiple entities:

```typescript
import { useComponents } from "@woven-canvas/vue";
import { TaskData } from "./components";

const props = defineProps<{ entityIds: number[] }>();

// Returns Ref<(TaskDataType | null)[]>
const tasks = useComponents(props.entityIds, TaskData);

// Access all task data
watchEffect(() => {
  for (const task of tasks.value) {
    if (task) {
      console.log("Task:", task.title);
    }
  }
});
```

## useSingleton

Subscribe to a singleton's data:

```typescript
import { useSingleton } from "@woven-canvas/vue";
import { Camera } from "@woven-canvas/core";

// Returns Ref<CameraData>
const camera = useSingleton(Camera);

watchEffect(() => {
  console.log("Zoom:", camera.value.zoom);
  console.log("Position:", camera.value.left, camera.value.top);
});
```

## useQuery

Subscribe to a query and get matching entities:

```typescript
import { useQuery } from "@woven-canvas/vue";
import { Block } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Query for selected blocks
const selectedItems = useQuery([Block, Selected] as const);

// Returns Ref<QueryResultItem[]>
watchEffect(() => {
  console.log("Selected count:", selectedItems.value.length);

  for (const item of selectedItems.value) {
    console.log("Entity:", item.entityId);
    console.log("Block data:", item.block.value);
  }
});
```

The result items have reactive refs for each component:

```typescript
interface QueryResultItem {
  entityId: number;
  block: Ref<BlockData>;
  selected: Ref<SelectedData>;
  // ... one ref per queried component
}
```

## useToolbar

Access and control the active toolbar tool:

```typescript
import { useToolbar } from "@woven-canvas/vue";

const { activeTool } = useToolbar();

// Watch for tool changes
watch(activeTool, (newTool, oldTool) => {
  if (newTool === "select") {
    console.log("Select tool activated");
  }
});

// Set the active tool
activeTool.value = "hand";
```

## useFonts

Access loaded fonts:

```typescript
import { useFonts } from "@woven-canvas/vue";

const { fonts, loadFont } = useFonts();

// List of loaded font families
watchEffect(() => {
  console.log("Available fonts:", fonts.value);
});
```

## useTextEditorController

Control text editing state:

```typescript
import { useTextEditorController } from "@woven-canvas/vue";

const {
  isEditing, // Ref<boolean>
  entityId, // Ref<number | null>
  blockElement, // Ref<HTMLElement | null>
  // ... more state and methods
} = useTextEditorController();
```

## useTextFormatting

Access text formatting state for selected text:

```typescript
import { useTextFormatting } from "@woven-canvas/vue";

const {
  state, // TextFormattingState (bold, italic, etc.)
  commands, // TextFormattingCommands (toggleBold, setFontSize, etc.)
} = useTextFormatting();

// Check if selection is bold
if (state.bold) {
  console.log("Text is bold");
}

// Toggle bold
commands.toggleBold();
```

## useTooltipSingleton

Access the shared tooltip state:

```typescript
import { useTooltipSingleton } from "@woven-canvas/vue";

const {
  isVisible, // Ref<boolean>
  text, // Ref<string>
  position, // Ref<{ x: number, y: number }>
  show, // (text: string, x: number, y: number) => void
  hide, // () => void
  reset, // () => void
} = useTooltipSingleton();
```
