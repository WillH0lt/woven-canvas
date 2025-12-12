/**
 * Resources required by the input plugin.
 * Pass these when creating the Editor.
 *
 * @example
 * ```typescript
 * const editor = new Editor({
 *   plugins: [InputPlugin],
 *   resources: {
 *     domElement: document.getElementById('canvas'),
 *   } satisfies InputResources,
 * });
 * ```
 */
export interface InputResources {
  /**
   * The DOM element to attach input listeners to.
   * This should be the editor's main container or canvas element.
   */
  domElement: HTMLElement;
}
