# Consolidate EditorComponentDef/EditorSingletonDef/Synced to ecs-sync

## Summary

Remove duplicate `EditorComponentDef`, `EditorSingletonDef`, and `Synced` from `editor` and use the canonical definitions from `ecs-sync`. Add `ecs-sync` as a dependency of both `editor` and `vue`. Remove the `StoreAdapter` interface from `vue`.

## API Migration

The `ecs-sync` versions use an options-object constructor pattern and `__sync` instead of `__editor`:

```
// OLD (editor)
defineEditorComponent("name", schema, { sync: "document" })
new EditorComponentDef("name", schema, { sync: "document" })
def.__editor.sync

// NEW (ecs-sync)
defineEditorComponent({ name: "name", sync: "document" }, schema)
new EditorComponentDef({ name: "name", sync: "document" }, schema)
def.__sync
```

`Synced` in ecs-sync is a plain `defineComponent` (not an EditorComponentDef) — it doesn't need sync metadata since it's the marker itself.

## Steps

### 1. Add `ecs-sync` as dependency to `editor` and `vue`

- `packages/editor/package.json`: add `"@infinitecanvas/ecs-sync": "workspace:*"`
- `packages/vue/package.json`: add `"@infinitecanvas/ecs-sync": "workspace:*"`

### 2. Delete editor's own definitions

Delete these files (their exports will be replaced by re-exports from ecs-sync):
- `packages/editor/src/EditorComponentDef.ts`
- `packages/editor/src/EditorSingletonDef.ts`
- `packages/editor/src/components/Synced.ts`

### 3. Update `editor/src/index.ts` exports

Replace the local exports with re-exports from `@infinitecanvas/ecs-sync`:

```ts
export {
  EditorComponentDef,
  defineEditorComponent,
  type AnyEditorComponentDef,
} from "@infinitecanvas/ecs-sync";

export {
  EditorSingletonDef,
  defineEditorSingleton,
  type AnyEditorSingletonDef,
  type SingletonEditorBehavior,
} from "@infinitecanvas/ecs-sync";

export { Synced } from "@infinitecanvas/ecs-sync";
```

Remove `EditorComponentOptions` and `EditorSingletonOptions` from exports (these types don't exist in ecs-sync; the options are inline in the first arg).

Also re-export `SyncBehavior` from ecs-sync instead of from local types (or keep local — both define the same type; simplest to re-export from ecs-sync).

Remove `EditorComponentMeta` from `editor/src/types.ts` and its export.

### 4. Update `editor/src/types.ts`

- Remove the `EditorComponentMeta` interface (no longer used)
- Remove the `SyncBehavior` type (now comes from ecs-sync)
- Update imports of `AnyEditorComponentDef` and `AnyEditorSingletonDef` to come from `@infinitecanvas/ecs-sync`

### 5. Update `EditorStateDef` (extends EditorSingletonDef)

`packages/editor/src/EditorStateDef.ts`:
- Change import from `"./EditorSingletonDef"` to `"@infinitecanvas/ecs-sync"`
- Update constructor: `super({ name, sync: "none" }, schema)` instead of `super(name, schema, { sync: "none" })`

### 6. Update all component/singleton definitions in `editor`

Each file that imports from `"../EditorComponentDef"` or `"../EditorSingletonDef"` needs to:
1. Change import to `"@infinitecanvas/ecs-sync"`
2. Update constructor/function call to options-object pattern

Files to update (components using `extends EditorComponentDef` with `super(name, schema, opts)`):
- `components/Block.ts`: `super({ name: "block", sync: "document" }, BlockSchema)`
- `components/Color.ts`: `super({ name: "color", sync: "document" }, ColorSchema)`
- `components/Aabb.ts`: `super({ name: "aabb" }, AabbSchema)`
- `components/Text.ts`: `super({ name: "text", sync: "document" }, TextSchema)`
- `components/Pointer.ts`: `super({ name: "pointer" }, PointerSchema)`
- `components/HitGeometry.ts`: `super({ name: "hitHeometry" }, HitGeometrySchema)`

Files using `defineEditorComponent(name, schema, opts)`:
- `components/Held.ts`: `defineEditorComponent({ name: "held", sync: "ephemeral" }, { ... })`
- `components/User.ts`: `defineEditorComponent({ name: "user", sync: "ephemeral" }, { ... })`
- `components/VerticalAlign.ts`: `defineEditorComponent({ name: "verticalAlign", sync: "document" }, { ... })`
- `components/ScaleWithZoom.ts`: `defineEditorComponent({ name: "scaleWithZoom" }, { ... })`
- `components/Opacity.ts`: `defineEditorComponent({ name: "opacity" }, { ... })`
- `components/Hovered.ts`: `defineEditorComponent({ name: "hovered" }, {})`
- `components/Edited.ts`: `defineEditorComponent({ name: "edited" }, {})`
- `components/Connector.ts`: `defineEditorComponent({ name: "connector", sync: "document" }, { ... })`

Files using `defineEditorSingleton(name, schema, opts)`:
- `singletons/Frame.ts`: `defineEditorSingleton({ name: "frame" }, { ... })`
- `singletons/ScaleWithZoomState.ts`: `defineEditorSingleton({ name: "scaleWithZoomState" }, { ... })`

Files using `extends EditorSingletonDef` with `super(name, schema, opts)`:
- `singletons/Camera.ts`: `super({ name: "camera" }, CameraSchema)`

Also update `components/Synced.ts` usage — this file is being deleted, so any file importing from it needs to import from `@infinitecanvas/ecs-sync` instead. Check `components/index.ts` barrel.

### 7. Update `editor/src/Editor.ts`

- Change import of `AnyEditorComponentDef` from `"./EditorComponentDef"` to `"@infinitecanvas/ecs-sync"`
- Change import of `AnyEditorSingletonDef` from `"./EditorSingletonDef"` to `"@infinitecanvas/ecs-sync"`
- Change import of `Synced` from `"./components"` — verify it's re-exported from components barrel, or import from `@infinitecanvas/ecs-sync`

### 8. Update `editor/src/plugin.ts`

- Change import of `AnyEditorComponentDef` to `"@infinitecanvas/ecs-sync"`
- Change import of `AnyEditorSingletonDef` to `"@infinitecanvas/ecs-sync"`

### 9. Update `__editor.sync` → `__sync` across all packages

All references to `def.__editor.sync` become `def.__sync`:

- `packages/store/src/Store.ts` (6 occurrences)
- `packages/store-yjs/src/YjsStore.ts` (6 occurrences)
- `packages/store-automerge/src/Store.ts` (8 occurrences)
- `packages/plugin-selection/src/systems/update/blockSystem.ts` (3 occurrences)
- `packages/editor/__tests__/plugin.test.ts` (3 occurrences)

### 10. Update plugin packages

Plugin packages that use `defineEditorComponent`:
- `packages/plugin-arrows/src/components/ArrowTrim.ts`
- `packages/plugin-arrows/src/components/ArrowHandle.ts`
- `packages/plugin-selection/src/components/TransformHandle.ts`
- `packages/plugin-selection/src/components/TransformBox.ts`
- `packages/plugin-selection/src/components/SelectionBox.ts`
- `packages/plugin-selection/src/components/Selected.ts`
- `packages/plugin-selection/src/components/EditAfterPlacing.ts`
- `packages/plugin-selection/src/components/DragStart.ts`
- `packages/plugin-eraser/src/components/EraserStroke.ts`
- `packages/plugin-eraser/src/components/Erased.ts`
- `packages/plugin-pen/src/components/PenStroke.ts`

These all import `defineEditorComponent` from `@infinitecanvas/editor` (which will re-export from ecs-sync), so they only need the call-site signature updated.

### 11. Update `vue` package

- Remove `packages/vue/src/store.ts`
- Update `packages/vue/src/index.ts`:
  - Remove `StoreAdapter` export
  - Add re-exports from `@infinitecanvas/ecs-sync`: `EditorSync`, `EditorSyncOptions`, `EditorComponentDef`, `EditorSingletonDef`, `defineEditorComponent`, `defineEditorSingleton`, `Synced`
- Update `packages/vue/src/BasicsPlugin.ts`: replace `StoreAdapter` with `EditorSync` from ecs-sync
- Update `packages/vue/src/components/InfiniteCanvas.vue`: replace `StoreAdapter` with `EditorSync`
- Update `packages/vue/src/systems/undoRedoSystem.ts`: update type reference

### 12. Update vue tests

- `packages/vue/__tests__/useQuery.test.ts`: update `defineEditorComponent` call signature
- `packages/vue/__tests__/useComponent.test.ts`: update `defineEditorComponent` call signature
- `packages/vue/__tests__/useSingleton.test.ts`: update `defineEditorSingleton` call signature

### 13. Update editor tests

- `packages/editor/__tests__/plugin.test.ts`: update all `new EditorComponentDef(...)` and `new EditorSingletonDef(...)` calls and `__editor.sync` references

### 14. Build and verify

- Run `pnpm build` across affected packages
- Run `pnpm test` to verify nothing is broken
