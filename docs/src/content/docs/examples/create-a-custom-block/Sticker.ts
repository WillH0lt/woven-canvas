import { field } from '@woven-canvas/core'
import { defineCanvasComponent } from '@woven-canvas/vue'

export const Sticker = defineCanvasComponent(
  { name: 'sticker', sync: 'document' },
  {
    emoji: field.string().max(8).default('😀'),
  },
)
