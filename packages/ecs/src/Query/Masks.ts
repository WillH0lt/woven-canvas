import type { Context } from "../types";

/** Component bitmasks for query matching (8 components per byte) */
export class QueryMasks {
  tracking: Uint8Array;
  with: Uint8Array;
  without: Uint8Array;
  any: Uint8Array;

  hasTracking: boolean;
  hasWith: boolean;
  hasWithout: boolean;
  hasAny: boolean;

  constructor(
    tracking: Uint8Array,
    withMask: Uint8Array,
    without: Uint8Array,
    any: Uint8Array,
    hasTracking: boolean,
    hasWith: boolean,
    hasWithout: boolean,
    hasAny: boolean
  ) {
    this.tracking = tracking;
    this.with = withMask;
    this.without = without;
    this.any = any;
    this.hasTracking = hasTracking;
    this.hasWith = hasWith;
    this.hasWithout = hasWithout;
    this.hasAny = hasAny;
  }

  /**
   * Check if query only matches singletons (no regular components)
   */
  usesSingleton(ctx: Context): boolean {
    const { components } = ctx;

    if (!this.hasTracking && !this.hasWith) {
      return false;
    }

    const maxLength = Math.max(this.tracking.length, this.with.length);

    for (let byteIndex = 0; byteIndex < maxLength; byteIndex++) {
      const trackingByte =
        byteIndex < this.tracking.length ? this.tracking[byteIndex] : 0;
      const withByte = byteIndex < this.with.length ? this.with[byteIndex] : 0;
      const combinedByte = trackingByte | withByte;

      if (combinedByte === 0) continue;

      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        if ((combinedByte & (1 << bitIndex)) !== 0) {
          const componentId = byteIndex * 8 + bitIndex;

          // Find component with this ID
          const component = Object.values(components).find(
            (comp) => comp.componentId === componentId
          );

          // If we found a non-singleton component, return false
          if (component && !component.isSingleton) {
            return false;
          }
        }
      }
    }

    return true;
  }
}
