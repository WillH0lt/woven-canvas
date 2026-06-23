import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

/**
 * Layer component — a named z-order band within a page.
 *
 * Blocks reference a layer via `Block.layerId`. A block's effective z-order is
 * `(stratum, layer rank, hierarchical rank chain)`: layer rank dominates the
 * per-block rank chain but never inverts parent/child within a layer. Layer
 * ordering is folded into the shared `compareBlockOrder`, so both the DOM (vue)
 * and external renderers stack content by layer consistently.
 *
 * Membership is carried by every block directly via `Block.layerId` (a frame
 * and its children each get their own); there is no inheritance walk.
 * `locked`/`hidden` are read by hit-testing — blocks on such a layer are
 * skipped (not hovered, not selectable).
 */
export const Layer = defineCanvasComponent(
  { name: 'layer', sync: 'document' },
  {
    /** Parent frame/page entity this layer belongs to — back-reference. Layers
     *  exist only for sorting; they have no geometry of their own. */
    parentId: field.ref(),
    /** Z-order rank among the page's layers (LexoRank string). Higher sorts in front. */
    rank: field.string().max(36).default(''),
    /** Display name shown in the layers panel. */
    label: field.string().max(128).default('Layer'),
    /** When true, blocks in this layer are not selectable (skipped by hit-testing). */
    locked: field.boolean().default(false),
    /** When true, the layer is not rendered and is skipped by hit-testing. */
    hidden: field.boolean().default(false),
  },
)
