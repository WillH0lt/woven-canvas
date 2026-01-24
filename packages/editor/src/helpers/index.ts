// Block definition helpers (plugin-specific)
export {
  getBlockDefs,
  getBlockDef,
  canBlockEdit,
  canBlockRotate,
  canBlockScale,
} from "./blockDefs";

// Intersection helpers
export {
  intersectPoint,
  intersectAabb,
  getTopmostBlockAtPoint,
} from "./intersect";

export { intersectCapsule } from "./intersectCapsule";

// AABB computation
export { computeAabb } from "./computeAabb";

// Held state helpers
export { isHeldByRemote } from "./held";
