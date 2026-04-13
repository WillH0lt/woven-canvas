// Embed helpers

// Block definition helpers (plugin-specific)
export {
  canBlockEdit,
  canBlockInteract,
  canBlockRotate,
  canBlockScale,
  getBlockDef,
  getBlockDefs,
  getBlockResizeMode,
} from './blockDefs'
// AABB computation
export { computeAabb } from './computeAabb'
export { detectEmbedProvider, resolveEmbedUrl, validateEmbedUrl } from './embed'
// Frame helpers
export { findFrameAtPoint } from './findFrameAtPoint'
// Held state helpers
export { isHeldByRemote } from './held'
// Hierarchy helpers
export { cascadeDelete, getChildren, getDescendants, getWorldPosition, isAncestor, worldToLocal } from './hierarchy'
// Intersection helpers
export {
  getTopmostBlockAtPoint,
  intersectAabb,
  intersectPoint,
} from './intersect'
export { intersectCapsule } from './intersectCapsule'
// Ref field helpers
export {
  convertRefsToUuids,
  getEntityUuid,
  getRefFieldNames,
  resolveRefFields,
} from './ref'
// Selection helpers
export { deselectAll, deselectBlock, selectAll, selectBlock } from './select'

// Block sort helpers
export { compareBlockOrder, type SortableBlock } from './sortBlocks'

// User helpers
export { getMyUserEntityId } from './user'
export { generateUuidBySeed } from './uuid'
