# Vue Floating Menu Implementation Plan

## Overview

This document outlines the implementation plan for adding Vue-based floating menus (contextual toolbars) to the `plugin-infinite-canvas` package. This replaces the Lit web component approach from the core package with a more user-friendly Vue composition API.

## Goals

1. **Simple customization**: Users can easily create custom floating menus using Vue components
2. **Framework alignment**: Vue as a peer dependency matches the expected usage pattern
3. **Tldraw-inspired API**: Follow the successful patterns from tldraw's contextual toolbar
4. **Reactive by design**: Leverage Vue's reactivity for automatic updates based on selection state

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│  User's Vue App                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  <InfiniteCanvas>                                         │  │
│  │    <template #floating-menu="{ selection, commands }">    │  │
│  │      <FloatingToolbar>                                    │  │
│  │        <BoldButton />                                     │  │
│  │        <ColorPicker />                                    │  │
│  │      </FloatingToolbar>                                   │  │
│  │    </template>                                            │  │
│  │  </InfiniteCanvas>                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `useCanvasStore()` | Composable providing reactive access to selection, bounds, shared styles |
| `useCommands()` | Composable providing command dispatch (bold, delete, etc.) |
| `FloatingToolbar.vue` | Positioned container with Floating UI integration |
| `ToolbarButton.vue` | Basic button with tooltip support |
| `ToolbarDivider.vue` | Visual separator |

---

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 Add Vue as Peer Dependency

```json
// package.json
{
  "peerDependencies": {
    "vue": "^3.4"
  },
  "peerDependenciesMeta": {
    "vue": {
      "optional": true
    }
  },
  "devDependencies": {
    "@floating-ui/vue": "^1.0"
  }
}
```

#### 1.2 Create Store Bridge

Bridge between the ECS state and Vue reactivity:

```typescript
// src/vue/composables/useCanvasStore.ts
import { ref, computed, shallowRef, type Ref, type ComputedRef } from 'vue'
import type { EditorContext } from '@infinitecanvas/editor'

export interface CanvasStore {
  // Selection state
  selectedIds: ComputedRef<string[]>
  selectedCount: ComputedRef<number>
  hasSelection: ComputedRef<boolean>

  // Bounds for positioning
  selectionScreenBounds: ComputedRef<{ x: number; y: number; width: number; height: number } | null>

  // Shared styles across selection
  getSharedStyle: <T>(styleName: string) => ComputedRef<{ type: 'shared' | 'mixed'; value?: T }>

  // Editor state
  isIdle: ComputedRef<boolean>
  zoom: ComputedRef<number>
}

export function useCanvasStore(ctx: EditorContext): CanvasStore {
  // Implementation bridges ECS queries to Vue refs
}
```

#### 1.3 Create Commands Composable

```typescript
// src/vue/composables/useCommands.ts
export interface CanvasCommands {
  // Text formatting
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void

  // Block operations
  deleteSelected: () => void
  duplicateSelected: () => void
  bringForward: () => void
  sendBackward: () => void

  // Color
  setFillColor: (color: string) => void
  setStrokeColor: (color: string) => void

  // Custom command dispatch
  dispatch: (command: string, payload?: unknown) => void
}

export function useCommands(ctx: EditorContext): CanvasCommands {
  // Implementation wraps existing command system
}
```

---

### Phase 2: Vue Components

#### 2.1 FloatingToolbar Component

```vue
<!-- src/vue/components/FloatingToolbar.vue -->
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useFloating, offset, flip, shift } from '@floating-ui/vue'
import { useCanvasStore } from '../composables/useCanvasStore'

const props = defineProps<{
  placement?: 'top' | 'bottom'
  offset?: number
}>()

const store = useCanvasStore()

// Virtual element for Floating UI (positioned at selection bounds)
const virtualEl = computed(() => ({
  getBoundingClientRect: () => {
    const bounds = store.selectionScreenBounds.value
    if (!bounds) return new DOMRect()
    // Return rect with zero height so menu appears above
    return new DOMRect(bounds.x, bounds.y, bounds.width, 0)
  }
}))

const floating = ref<HTMLElement | null>(null)
const { floatingStyles } = useFloating(virtualEl, floating, {
  placement: props.placement ?? 'top',
  middleware: [
    offset(props.offset ?? 8),
    flip(),
    shift({ padding: 8 })
  ]
})

const showToolbar = computed(() =>
  store.hasSelection.value && store.isIdle.value
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showToolbar"
      ref="floating"
      class="ic-floating-toolbar"
      :style="floatingStyles"
    >
      <slot />
    </div>
  </Teleport>
</template>

<style>
.ic-floating-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--ic-toolbar-bg, #1e1e1e);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}
</style>
```

#### 2.2 ToolbarButton Component

```vue
<!-- src/vue/components/ToolbarButton.vue -->
<script setup lang="ts">
defineProps<{
  icon?: string
  tooltip?: string
  active?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    class="ic-toolbar-button"
    :class="{ active, disabled }"
    :title="tooltip"
    :disabled="disabled"
    @click="emit('click')"
  >
    <slot>
      <span v-if="icon" class="icon">{{ icon }}</span>
    </slot>
  </button>
</template>
```

#### 2.3 Conditional Toolbar (Per Block Type)

```vue
<!-- Example: TextToolbar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore, useCommands } from '../composables'
import FloatingToolbar from './FloatingToolbar.vue'
import ToolbarButton from './ToolbarButton.vue'

const store = useCanvasStore()
const commands = useCommands()

// Only show for text blocks
const hasTextSelected = computed(() =>
  store.getSharedStyle('blockType').value?.value === 'text'
)

const isBold = computed(() =>
  store.getSharedStyle('fontWeight').value?.value === 'bold'
)
</script>

<template>
  <FloatingToolbar v-if="hasTextSelected">
    <ToolbarButton
      tooltip="Bold"
      :active="isBold"
      @click="commands.toggleBold()"
    >
      <strong>B</strong>
    </ToolbarButton>
    <ToolbarButton tooltip="Italic" @click="commands.toggleItalic()">
      <em>I</em>
    </ToolbarButton>
  </FloatingToolbar>
</template>
```

---

### Phase 3: Integration with Plugin

#### 3.1 Plugin Options Extension

```typescript
// src/types.ts (additions)
export const FloatingMenuDef = z.object({
  /** Block types this menu applies to (empty = all) */
  blockTypes: z.array(z.string()).optional(),

  /** Vue component to render */
  component: z.custom<Component>(() => true),

  /** Order index for multiple menus */
  order: z.number().default(0),
})

// Add to InfiniteCanvasPluginOptionsSchema
floatingMenus: z.array(FloatingMenuDef).optional(),
```

#### 3.2 Provide/Inject Pattern

```typescript
// src/vue/provide.ts
import { provide, inject, type InjectionKey } from 'vue'
import type { CanvasStore, CanvasCommands } from './composables'

export const CanvasStoreKey: InjectionKey<CanvasStore> = Symbol('canvas-store')
export const CanvasCommandsKey: InjectionKey<CanvasCommands> = Symbol('canvas-commands')

// In parent component:
// provide(CanvasStoreKey, store)
// provide(CanvasCommandsKey, commands)

// In child components:
// const store = inject(CanvasStoreKey)!
// const commands = inject(CanvasCommandsKey)!
```

---

### Phase 4: Positioning System

#### 4.1 System to Update Position Refs

Create an ECS system that updates Vue refs each frame:

```typescript
// src/systems/SyncVueFloatingMenu.ts
export function createSyncVueFloatingMenuSystem(vueRefs: VueFloatingMenuRefs) {
  return function SyncVueFloatingMenu(ctx: SystemContext) {
    // Query selected blocks
    const selected = query(ctx, [Selected, Aabb])

    if (selected.length === 0) {
      vueRefs.selectionBounds.value = null
      return
    }

    // Calculate combined bounds
    const bounds = calculateCombinedBounds(selected)

    // Transform to screen coordinates
    const screenBounds = worldToScreen(ctx, bounds)

    vueRefs.selectionBounds.value = screenBounds
  }
}
```

---

## File Structure

```
src/
├── vue/
│   ├── index.ts                    # Vue exports
│   ├── composables/
│   │   ├── index.ts
│   │   ├── useCanvasStore.ts       # Reactive store bridge
│   │   ├── useCommands.ts          # Command dispatch
│   │   └── useFloatingMenu.ts      # Menu positioning logic
│   ├── components/
│   │   ├── index.ts
│   │   ├── FloatingToolbar.vue     # Main toolbar container
│   │   ├── ToolbarButton.vue       # Button primitive
│   │   ├── ToolbarDivider.vue      # Separator
│   │   └── ToolbarDropdown.vue     # Dropdown menu
│   └── provide.ts                  # Injection keys
├── systems/
│   └── SyncVueFloatingMenu.ts      # ECS <-> Vue bridge system
└── types.ts                        # Extended with FloatingMenuDef
```

---

## Usage Examples

### Basic Usage

```vue
<script setup lang="ts">
import { InfiniteCanvas, FloatingToolbar, ToolbarButton } from '@infinitecanvas/plugin-infinite-canvas/vue'
</script>

<template>
  <InfiniteCanvas>
    <template #floating-menu>
      <FloatingToolbar>
        <ToolbarButton icon="trash" tooltip="Delete" @click="commands.deleteSelected()" />
        <ToolbarButton icon="copy" tooltip="Duplicate" @click="commands.duplicateSelected()" />
      </FloatingToolbar>
    </template>
  </InfiniteCanvas>
</template>
```

### Conditional Menus

```vue
<template>
  <InfiniteCanvas>
    <template #floating-menu="{ selection }">
      <!-- Text-specific toolbar -->
      <TextToolbar v-if="selection.hasType('text')" />

      <!-- Image-specific toolbar -->
      <ImageToolbar v-else-if="selection.hasType('image')" />

      <!-- Default toolbar for all -->
      <DefaultToolbar v-else />
    </template>
  </InfiniteCanvas>
</template>
```

### Custom Toolbar Component

```vue
<script setup lang="ts">
import { useCanvasStore, useCommands } from '@infinitecanvas/plugin-infinite-canvas/vue'

const store = useCanvasStore()
const commands = useCommands()

const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
</script>

<template>
  <FloatingToolbar>
    <div class="color-palette">
      <button
        v-for="color in colors"
        :key="color"
        :style="{ background: color }"
        @click="commands.setFillColor(color)"
      />
    </div>
  </FloatingToolbar>
</template>
```

---

## Migration from Core Lit Components

| Core (Lit) | Plugin (Vue) |
|------------|--------------|
| `ICFloatingMenu` | `FloatingToolbar.vue` |
| `ic-color-button` | `<ToolbarButton>` + slot |
| `ic-color-menu` | Custom Vue component |
| `FloatingMenuDef.buttons[]` | Slot content |
| `@floating-ui/dom` | `@floating-ui/vue` |
| Preact signals | Vue `computed`/`ref` |
| Lit context | Vue `provide`/`inject` |

---

## Open Questions

1. **Separate entry point?**
   - Option A: `@infinitecanvas/plugin-infinite-canvas/vue`
   - Option B: `@infinitecanvas/plugin-infinite-canvas-vue` (separate package)
   - Recommendation: Option A with conditional exports

2. **SSR support?**
   - Need to handle `Teleport` and `getBoundingClientRect` for SSR
   - Could provide `<ClientOnly>` wrapper

3. **Headless option?**
   - Should we also provide a headless API for non-Vue users?
   - Could export `useFloatingMenuPosition()` as pure JS

4. **Animation?**
   - Fade in/out transitions
   - Follow selection smoothly during drag?

5. **Multiple toolbars?**
   - Allow multiple FloatingToolbars at different positions?
   - Stacking/ordering when multiple apply?

---

## Dependencies to Add

```json
{
  "peerDependencies": {
    "vue": "^3.4"
  },
  "peerDependenciesMeta": {
    "vue": {
      "optional": true
    }
  },
  "dependencies": {
    "@floating-ui/vue": "^1.1"
  }
}
```

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Add Vue peer dependency and @floating-ui/vue
3. [ ] Implement `useCanvasStore` composable
4. [ ] Implement `useCommands` composable
5. [ ] Create `FloatingToolbar.vue` component
6. [ ] Create `ToolbarButton.vue` component
7. [ ] Add ECS system for syncing selection bounds
8. [ ] Create example/demo
9. [ ] Write documentation
10. [ ] Add tests
