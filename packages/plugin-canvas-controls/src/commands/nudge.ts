import { defineCommand, type Vec2 } from '@woven-canvas/core'

/** Move the selected blocks by an offset in world units. */
export const NudgeSelected = defineCommand<{ offset: Vec2 }>('nudge-selected')

/** Pan the camera by an offset in screen pixels. */
export const NudgeCamera = defineCommand<{ offset: Vec2 }>('nudge-camera')
