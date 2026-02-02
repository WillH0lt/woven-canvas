export {
  Pointer,
  PointerButton,
  PointerType,
  addPointerSample,
} from "./Pointer";

// Core spatial components
export { Block } from "./Block";
export { Aabb } from "./Aabb";

// State components
export { Hovered } from "./Hovered";
export { Edited } from "./Edited";
export { Held } from "./Held";

// Transform components
export { ScaleWithZoom } from "./ScaleWithZoom";
export { Opacity } from "./Opacity";
export { Color } from "./Color";

// Content components
export { Text } from "./Text";
export { Connector } from "./Connector";
export { VerticalAlign } from "./VerticalAlign";

// User presence
export { User } from "./User";

// Hit geometry for collision detection
export { HitGeometry, MAX_HIT_CAPSULES, MAX_HIT_ARCS } from "./HitGeometry";
