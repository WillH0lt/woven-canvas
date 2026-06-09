import { defineCanvasSingleton, field } from '@woven-canvas/core'
import { STROKE_THICKNESS } from '../constants'
import { PenStrokeKind } from '../types'

/**
 * PenPresetSingleton - live brush preset that the pen capture system reads
 * when starting a stroke. Mutate the fields to change the next stroke's
 * thickness or color at runtime (e.g. a thickness slider or color picker).
 *
 * Brush-variant tagging (crayon vs pen, etc.) is intentionally outside
 * the plugin's scope — consumers that need it should define their own
 * component and attach it to new stroke entities via a downstream system.
 *
 * @example
 * ```typescript
 * import { PenPresetSingleton } from '@woven-canvas/plugin-pen';
 *
 * // Switch to a thick red brush.
 * const preset = PenPresetSingleton.write(ctx);
 * preset.thickness = 16;
 * preset.red = 220;
 * preset.green = 38;
 * preset.blue = 38;
 * ```
 */
export const PenPresetSingleton = defineCanvasSingleton(
  { name: 'penPreset' },
  {
    /** Stroke thickness in world coordinates. */
    thickness: field.float32().default(STROKE_THICKNESS),
    /** Stroke color — applied to the new stroke's `Color` component. */
    red: field.uint8().default(0),
    green: field.uint8().default(0),
    blue: field.uint8().default(0),
    alpha: field.uint8().default(255),
    kind: field.enum(PenStrokeKind).default(PenStrokeKind.Stroke),
  },
)
