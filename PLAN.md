# Floating Menu Migration Plan

## Overview

Migrate the floating menu system from `packages/core` (Lit-based, tightly coupled) to `packages/vue` (Vue-based, plugin-driven). The floating menu will be a Block entity, making positioning automatic via the existing camera transform system.

## Design Goals

1. **Floating menu as a Block** - Simplifies positioning (handled by camera transforms)
2. **Component-based button registration** - Plugins declare which buttons appear for which components
3. **Slot-based customization** - Users can override any component's buttons via named slots
4. **Filter by selectedBy** - Multi-user support (only show menu for current user's selection)
5. **Vue + floating-ui** - Modern stack with proper dropdown positioning
6. **Fade animations** - Smooth visibility transitions

## User-Facing API

### Basic Usage (Default Buttons)

```vue
<InfiniteCanvas>
  <!-- Blocks render here, floating menu appears automatically -->
  <template #sticky-note="{ entityId }">
    <StickyNote :entityId="entityId" />
  </template>
</InfiniteCanvas>
```

### Custom Floating Menu (Full Override)

```vue
<InfiniteCanvas>
  <template #floating-menu="{ selectedIds, commonComponents }">
    <FloatingMenuBar>
      <ColorButton v-if="commonComponents.has('color')" :entityIds="selectedIds" />
      <Divider v-if="commonComponents.has('color')" />
      <DeleteButton :entityIds="selectedIds" />
    </FloatingMenuBar>
  </template>
</InfiniteCanvas>
```

### Partial Override (Customize Specific Component Buttons)

```vue
<InfiniteCanvas>
  <template #floating-menu="{ selectedIds, commonComponents }">
    <FloatingMenuBar>
      <!-- Override just the color slot with custom component -->
      <template #color="{ entityIds }">
        <MyCustomColorButton :entityIds="entityIds" />
      </template>

      <!-- Keep default for other components -->
    </FloatingMenuBar>
  </template>
</InfiniteCanvas>
```

## Architecture

### 1. FloatingMenuPlugin (packages/vue)

A Vue-specific plugin that manages the floating menu entity lifecycle.

```typescript
// packages/vue/src/FloatingMenuPlugin.ts

export interface FloatingMenuButtonDef {
  /** Component name this button group is associated with */
  component: string;
  /** Sort order (lower = earlier in menu) */
  orderIndex: number;
  /** Vue component to render, or 'default' to use built-in */
  vueComponent?: Component;
}

export const FloatingMenuPlugin: EditorPlugin = {
  name: 'floating-menu',
  dependencies: ['selection'],

  components: [FloatingMenuData],

  blockDefs: [
    {
      tag: 'floating-menu',
      canRotate: false,
      canScale: false,
      components: [FloatingMenuData]
    }
  ],

  systems: [
    floatingMenuLifecycleSystem,  // Create/destroy menu entity
    floatingMenuPositionSystem,   // Update position from selection bounds
  ],
};
```

### 2. FloatingMenuData Component

Stores the computed state for the floating menu entity.

```typescript
// packages/vue/src/components/FloatingMenuData.ts

const FloatingMenuDataSchema = {
  /** Comma-separated list of selected entity IDs */
  selectedIds: field.string().default(''),
  /** Comma-separated list of common component names */
  commonComponents: field.string().default(''),
  /** Is the menu visible (for animation) */
  visible: field.bool().default(true),
};

export const FloatingMenuData = new EditorComponentDef(
  'floating-menu-data',
  FloatingMenuDataSchema,
  { sync: 'none' }
);
```

### 3. Floating Menu Systems

#### Lifecycle System (Update Phase)

Creates/destroys the floating menu entity based on selection state.

```typescript
// packages/vue/src/systems/floatingMenuLifecycleSystem.ts

export const floatingMenuLifecycleSystem = defineEditorSystem(
  { phase: 'update', priority: -100 }, // Run after selection updates
  (ctx) => {
    const resources = getResources(ctx);
    const userId = resources.userId;

    // Query blocks selected by current user
    const selectedByMe = [];
    for (const entityId of selectedQuery.iter(ctx)) {
      const selected = Selected.read(ctx, entityId);
      if (selected.selectedBy === userId) {
        selectedByMe.push(entityId);
      }
    }

    const menuEntity = floatingMenuQuery.first(ctx);

    if (selectedByMe.length === 0) {
      // No selection - remove menu if exists
      if (menuEntity !== null) {
        markDead(ctx, menuEntity);
      }
      return;
    }

    // Compute common components across selection
    const commonComponents = computeCommonComponents(ctx, selectedByMe);

    if (menuEntity === null) {
      // Create menu entity
      createFloatingMenuEntity(ctx, selectedByMe, commonComponents);
    } else {
      // Update existing menu
      updateFloatingMenuData(ctx, menuEntity, selectedByMe, commonComponents);
    }
  }
);
```

#### Position System (Render Phase)

Updates menu position to track selection bounds.

```typescript
// packages/vue/src/systems/floatingMenuPositionSystem.ts

export const floatingMenuPositionSystem = defineEditorSystem(
  { phase: 'render', priority: 100 },
  (ctx) => {
    const menuEntity = floatingMenuQuery.first(ctx);
    if (menuEntity === null) return;

    const menuData = FloatingMenuData.read(ctx, menuEntity);
    const selectedIds = parseIds(menuData.selectedIds);

    // Compute bounding box of all selected blocks
    const bounds = computeSelectionBounds(ctx, selectedIds);

    // Position menu centered above selection
    const menuBlock = Block.write(ctx, menuEntity);
    menuBlock.position[0] = bounds.centerX - menuBlock.size[0] / 2;
    menuBlock.position[1] = bounds.top - menuBlock.size[1] - MENU_OFFSET;

    // If menu would be above viewport, flip to below
    const camera = Camera.read(ctx);
    const screenTop = (menuBlock.position[1] - camera.top) * camera.zoom;
    if (screenTop < 0) {
      menuBlock.position[1] = bounds.bottom + MENU_OFFSET;
    }

    // Hide if selection is completely off-screen
    const screen = Screen.read(ctx);
    const offScreen =
      bounds.right < camera.left ||
      bounds.left > camera.left + screen.width / camera.zoom;

    const data = FloatingMenuData.write(ctx, menuEntity);
    data.visible = !offScreen;
  }
);
```

### 4. Vue Components

#### FloatingMenu.vue

The default floating menu renderer. Rendered via InfiniteCanvas slot.

```vue
<!-- packages/vue/src/components/FloatingMenu.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EntityId } from '@infinitecanvas/editor';
import { useComponent } from '../composables/useComponent';
import { FloatingMenuData } from './FloatingMenuData';
import FloatingMenuBar from './FloatingMenuBar.vue';

const props = defineProps<{
  entityId: EntityId;
}>();

const menuData = useComponent(props.entityId, FloatingMenuData);

const selectedIds = computed(() =>
  menuData.value?.selectedIds.split(',').filter(Boolean) ?? []
);

const commonComponents = computed(() =>
  new Set(menuData.value?.commonComponents.split(',').filter(Boolean) ?? [])
);

const isVisible = computed(() => menuData.value?.visible ?? false);
</script>

<template>
  <div
    class="ic-floating-menu"
    :class="{ 'ic-floating-menu--hidden': !isVisible }"
  >
    <slot
      :selectedIds="selectedIds"
      :commonComponents="commonComponents"
    >
      <!-- Default: render FloatingMenuBar with default buttons -->
      <FloatingMenuBar
        :selectedIds="selectedIds"
        :commonComponents="commonComponents"
      />
    </slot>
  </div>
</template>

<style>
.ic-floating-menu {
  pointer-events: auto;
  transition: opacity 0.15s ease-out;
}

.ic-floating-menu--hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
```

#### FloatingMenuBar.vue

The default menu bar that renders buttons based on common components.

```vue
<!-- packages/vue/src/components/FloatingMenuBar.vue -->
<script setup lang="ts">
import { computed, useSlots } from 'vue';
import type { EntityId } from '@infinitecanvas/editor';
import ColorButton from './buttons/ColorButton.vue';
import Divider from './buttons/Divider.vue';
import DeleteButton from './buttons/DeleteButton.vue';

const props = defineProps<{
  selectedIds: string[];
  commonComponents: Set<string>;
}>();

const slots = useSlots();

// Built-in button definitions, ordered by priority
const builtInButtons = [
  { component: 'color', order: 10, default: ColorButton },
  // Add more built-in buttons here as needed
];

// Filter to only components present in selection
const activeButtons = computed(() =>
  builtInButtons.filter(b => props.commonComponents.has(b.component))
);
</script>

<template>
  <div class="ic-floating-menu-bar">
    <template v-for="(button, index) in activeButtons" :key="button.component">
      <!-- Divider between button groups -->
      <Divider v-if="index > 0" />

      <!-- Allow slot override, fall back to default component -->
      <slot :name="button.component" :entityIds="selectedIds">
        <component :is="button.default" :entityIds="selectedIds" />
      </slot>
    </template>

    <!-- Always show delete button at end -->
    <Divider v-if="activeButtons.length > 0" />
    <slot name="delete" :entityIds="selectedIds">
      <DeleteButton :entityIds="selectedIds" />
    </slot>
  </div>
</template>

<style>
.ic-floating-menu-bar {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  gap: 2px;
}
</style>
```

#### ColorButton.vue (Example Button)

```vue
<!-- packages/vue/src/components/buttons/ColorButton.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFloating, offset, flip, shift } from '@floating-ui/vue';

const props = defineProps<{
  entityIds: string[];
}>();

const buttonRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const { floatingStyles } = useFloating(buttonRef, menuRef, {
  placement: 'top',
  middleware: [offset(6), flip(), shift({ padding: 5 })],
});

function toggleMenu() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <button
    ref="buttonRef"
    class="ic-menu-button"
    title="Color"
    @click="toggleMenu"
  >
    <span class="ic-color-swatch" />
  </button>

  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="menuRef"
      class="ic-color-menu"
      :style="floatingStyles"
    >
      <ColorPicker :entityIds="entityIds" @close="isOpen = false" />
    </div>
  </Teleport>
</template>
```

### 5. Integration with InfiniteCanvas.vue

Update InfiniteCanvas to handle the floating-menu block tag:

```vue
<!-- In InfiniteCanvas.vue template -->
<div
  v-for="itemRef in sortedBlocks"
  :key="itemRef.value.entityId"
  :style="getBlockStyle(itemRef.value)"
>
  <slot
    :name="itemRef.value.block.tag"
    :entityId="itemRef.value.entityId"
    :selected="itemRef.value.selected !== null"
    :hovered="itemRef.value.hovered"
  >
    <!-- Built-in block renderers -->
    <SelectionBox v-if="itemRef.value.block.tag === 'selection-box'" />
    <TransformBox v-else-if="itemRef.value.block.tag === 'transform-box'" />
    <TransformHandle v-else-if="itemRef.value.block.tag === 'transform-handle'" />
    <StickyNote v-else-if="itemRef.value.block.tag === 'sticky-note'" :entityId="itemRef.value.entityId" />

    <!-- Floating menu with special slot forwarding -->
    <FloatingMenu
      v-else-if="itemRef.value.block.tag === 'floating-menu'"
      :entityId="itemRef.value.entityId"
    >
      <template #default="menuProps">
        <slot name="floating-menu" v-bind="menuProps" />
      </template>
    </FloatingMenu>
  </slot>
</div>
```

### 6. Plugin Registration for Custom Buttons

Allow plugins to register their component-to-button mappings:

```typescript
// packages/vue/src/FloatingMenuPlugin.ts

export interface FloatingMenuConfig {
  buttons: FloatingMenuButtonDef[];
}

export function FloatingMenuPlugin(config?: FloatingMenuConfig): EditorPlugin {
  return {
    name: 'floating-menu',
    dependencies: ['selection'],

    resources: {
      buttons: config?.buttons ?? [],
    },

    // ... rest of plugin
  };
}

// User registers custom buttons:
FloatingMenuPlugin({
  buttons: [
    { component: 'my-component', orderIndex: 15, vueComponent: MyButton },
  ]
})
```

## Implementation Steps

### Phase 1: Core Infrastructure

1. [ ] Create `FloatingMenuData` component in `packages/vue/src/components/`
2. [ ] Create `floatingMenuLifecycleSystem` in `packages/vue/src/systems/`
3. [ ] Create `floatingMenuPositionSystem` in `packages/vue/src/systems/`
4. [ ] Create `FloatingMenuPlugin` that bundles the above

### Phase 2: Vue Components

5. [ ] Create `FloatingMenu.vue` - wrapper with visibility/animation
6. [ ] Create `FloatingMenuBar.vue` - default button container with slot support
7. [ ] Create `Divider.vue` - visual separator
8. [ ] Create `MenuButton.vue` - base button component with tooltip support

### Phase 3: Built-in Buttons

9. [ ] Create `ColorButton.vue` with color picker dropdown
10. [ ] Create `ColorPicker.vue` - palette + custom color picker
11. [ ] Create `DeleteButton.vue` - remove selected blocks

### Phase 4: Integration

12. [ ] Update `InfiniteCanvas.vue` to render floating-menu blocks
13. [ ] Add `FloatingMenuPlugin` to default plugins in `InfiniteCanvas.vue`
14. [ ] Export new components and plugin from `packages/vue/src/index.ts`

### Phase 5: Polish

15. [ ] Add fade-in/fade-out animations
16. [ ] Handle edge cases (menu at viewport edges)
17. [ ] Add keyboard navigation support
18. [ ] Write tests for lifecycle and positioning systems

## File Structure

```
packages/vue/src/
├── components/
│   ├── FloatingMenuData.ts          # ECS component
│   ├── FloatingMenu.vue             # Main menu wrapper
│   ├── FloatingMenuBar.vue          # Button container
│   └── buttons/
│       ├── MenuButton.vue           # Base button
│       ├── ColorButton.vue          # Color picker trigger
│       ├── ColorPicker.vue          # Color palette dropdown
│       ├── DeleteButton.vue         # Delete action
│       └── Divider.vue              # Visual separator
├── systems/
│   ├── floatingMenuLifecycleSystem.ts
│   └── floatingMenuPositionSystem.ts
├── FloatingMenuPlugin.ts            # Plugin definition
├── BasicsPlugin.ts                  # (existing)
└── index.ts                         # Exports
```

## Dependencies

- `@floating-ui/vue` - For dropdown positioning
- Existing: `@infinitecanvas/editor`, `vue`

## Open Questions

1. **Menu size calculation**: The menu needs a known size for positioning. Should we:
   - Use a fixed size (simplest)
   - Measure after first render and update position
   - Use CSS to constrain width

2. **Z-ordering**: Should floating menu always be on top? Currently blocks use `rank` for z-order. Options:
   - Give floating menu a very high rank
   - Render in a separate layer (CSS z-index)
   - Use Teleport to render outside block container

3. **Touch support**: Should menu appear on touch-and-hold, or immediately on selection?

## Notes

- The floating menu is a Block entity, so it participates in the normal rendering pipeline
- Position is in world coordinates, transformed by camera like any block
- The `ScaleWithZoom` component can keep menu at fixed screen size if desired
- Multi-user filtering uses `Selected.selectedBy` matching `resources.userId`
