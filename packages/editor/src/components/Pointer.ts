import { field, type Context } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";

/**
 * Pointer button types
 */
export const PointerButton = {
  None: "none",
  Left: "left",
  Middle: "middle",
  Right: "right",
  Back: "back",
  Forward: "forward",
} as const;

export type PointerButton = (typeof PointerButton)[keyof typeof PointerButton];

/**
 * Pointer type (input device)
 */
export const PointerType = {
  Mouse: "mouse",
  Pen: "pen",
  Touch: "touch",
} as const;

export type PointerType = (typeof PointerType)[keyof typeof PointerType];

/**
 * Number of position samples to keep for velocity calculation
 */
const SAMPLE_COUNT = 6;

const PointerSchema = {
  /** Unique pointer ID (from PointerEvent.pointerId) */
  id: field.uint16().default(0),
  /** Current position relative to the editor element [x, y] */
  position: field.tuple(field.float32(), 2).default([0, 0]),
  /** Position where the pointer went down [x, y] */
  downPosition: field.tuple(field.float32(), 2).default([0, 0]),
  /** Frame number when the pointer went down (for click detection) */
  downFrame: field.uint32().default(0),
  /** Which button is pressed */
  button: field.enum(PointerButton).default(PointerButton.None),
  /** Type of pointer device */
  pointerType: field.enum(PointerType).default(PointerType.Mouse),
  /** Pressure from 0 to 1 (for pen/touch) */
  pressure: field.float32().default(0),
  /** Whether the pointer event target was not the editor element */
  obscured: field.boolean().default(false),
  // Velocity tracking (ring buffer for position samples)
  /** Ring buffer of previous positions [x0, y0, x1, y1, ...] @internal */
  _prevPositions: field.array(field.float32(), SAMPLE_COUNT * 2),
  /** Ring buffer of timestamps for each position sample @internal */
  _prevTimes: field.array(field.float32(), SAMPLE_COUNT),
  /** Total number of samples added (used for ring buffer indexing) @internal */
  _sampleCount: field.int32().default(0),
  /** Computed velocity [vx, vy] in pixels per second @internal */
  _velocity: field.tuple(field.float32(), 2).default([0, 0]),
};

/**
 * Pointer component - represents an active pointer (mouse, touch, or pen).
 *
 * Unlike Mouse (singleton), Pointer is a regular component because touch
 * can have multiple simultaneous pointers. Each pointer entity is created
 * on pointerdown and deleted on pointerup.
 *
 * This component stores position history for smooth velocity calculation
 * using exponentially time-decayed weighted least-squares fitting.
 */
class PointerDef extends EditorComponentDef<typeof PointerSchema> {
  constructor() {
    super(PointerSchema, { sync: "none" });
  }

  /** Get the computed velocity of a pointer */
  getVelocity(ctx: Context, entityId: number): [number, number] {
    const p = this.read(ctx, entityId);
    return [p._velocity[0], p._velocity[1]];
  }

  /**
   * Get the pointer button from a PointerEvent button number.
   * @param button - PointerEvent.button value
   * @returns PointerButton enum value
   */
  getButton(button: number): PointerButton {
    switch (button) {
      case 0:
        return PointerButton.Left;
      case 1:
        return PointerButton.Middle;
      case 2:
        return PointerButton.Right;
      case 3:
        return PointerButton.Back;
      case 4:
        return PointerButton.Forward;
      default:
        return PointerButton.None;
    }
  }

  /**
   * Get the pointer type from a PointerEvent pointerType string.
   * @param pointerType - PointerEvent.pointerType value
   * @returns PointerType enum value
   */
  getType(pointerType: string): PointerType {
    switch (pointerType) {
      case "pen":
        return PointerType.Pen;
      case "touch":
        return PointerType.Touch;
      default:
        return PointerType.Mouse;
    }
  }
}

export const Pointer = new PointerDef();

/**
 * Add a position sample and update velocity calculation.
 * Uses exponentially time-decayed weighted least-squares fitting.
 *
 * @param pointer - The writable pointer component
 * @param position - Current position [x, y]
 * @param time - Current time in seconds
 */
export function addPointerSample(
  pointer: ReturnType<typeof Pointer.write>,
  position: [number, number],
  time: number
): void {
  // Avoid duplicate samples at same time
  const currentIndex = pointer._sampleCount % SAMPLE_COUNT;
  const mostRecentTime = pointer._prevTimes[currentIndex] || 0;
  if (Math.abs(mostRecentTime - time) < 0.001) return;

  // Update current position
  pointer.position = position;

  // Push to ring buffer
  pointer._sampleCount++;
  const writeIndex = pointer._sampleCount % SAMPLE_COUNT;
  pointer._prevPositions[writeIndex * 2] = position[0];
  pointer._prevPositions[writeIndex * 2 + 1] = position[1];
  pointer._prevTimes[writeIndex] = time;

  // Calculate velocity using weighted least-squares
  const pointCount = Math.min(pointer._sampleCount, SAMPLE_COUNT);
  if (pointCount <= 1) {
    pointer._velocity = [0, 0];
    return;
  }

  const mod = (n: number) => ((n % SAMPLE_COUNT) + SAMPLE_COUNT) % SAMPLE_COUNT;

  // Exponentially time-decayed weighted least-squares fit
  const TAU = 0.04; // seconds, adjust to tune responsiveness vs smoothness
  const EPS = 1e-6;

  let W = 0;
  let WU = 0;
  let WUU = 0;
  let WX = 0;
  let WY = 0;
  let WU_X = 0;
  let WU_Y = 0;

  for (let j = 0; j < pointCount; j++) {
    const idx = mod(pointer._sampleCount - pointCount + 1 + j);

    const t = pointer._prevTimes[idx] || 0;
    const u = t - time;
    const recency = -u;

    if (recency > 5 * TAU) continue;

    const w = Math.exp(-recency / TAU);

    const x = pointer._prevPositions[idx * 2] || 0;
    const y = pointer._prevPositions[idx * 2 + 1] || 0;

    W += w;
    WU += w * u;
    WUU += w * u * u;

    WX += w * x;
    WY += w * y;

    WU_X += w * u * x;
    WU_Y += w * u * y;
  }

  const denom = W * WUU - WU * WU;
  if (Math.abs(denom) <= EPS) {
    // Fallback: last-segment velocity
    const iCurr = pointer._sampleCount % SAMPLE_COUNT;
    const iPrev = mod(pointer._sampleCount - 1);
    const dt =
      (pointer._prevTimes[iCurr] || 0) - (pointer._prevTimes[iPrev] || 0);
    if (dt > EPS) {
      const dx =
        (pointer._prevPositions[iCurr * 2] || 0) -
        (pointer._prevPositions[iPrev * 2] || 0);
      const dy =
        (pointer._prevPositions[iCurr * 2 + 1] || 0) -
        (pointer._prevPositions[iPrev * 2 + 1] || 0);
      pointer._velocity = [dx / dt, dy / dt];
    } else {
      pointer._velocity = [0, 0];
    }
    return;
  }

  const vx = (W * WU_X - WU * WX) / denom;
  const vy = (W * WU_Y - WU * WY) / denom;

  pointer._velocity = [vx, vy];
}
