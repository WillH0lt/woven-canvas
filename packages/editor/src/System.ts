import type { SystemFn } from "./types";

/**
 * Define an editor system that runs on the main thread.
 *
 * Editor systems receive the ECS Context. Access editor-specific data
 * via getResources<EditorResources>(ctx).
 *
 * @param execute - System execution function receiving Context
 * @returns The system function (for use in plugin inputSystems/updateSystems/etc)
 *
 * @example
 * ```typescript
 * import { getResources, type EditorResources } from '@infinitecanvas/editor';
 *
 * const mySystem = defineEditorSystem((ctx) => {
 *   const { editor, domElement } = getResources<EditorResources>(ctx);
 *
 *   // Access ECS data through ctx
 *   for (const eid of myQuery.current(ctx)) {
 *     const component = MyComponent.write(ctx, eid);
 *     // ...
 *   }
 * });
 * ```
 */
export function defineEditorSystem(execute: SystemFn): SystemFn {
  return execute;
}
