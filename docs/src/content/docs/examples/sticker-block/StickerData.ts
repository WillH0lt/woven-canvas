import { defineCanvasComponent, field } from '@woven-canvas/vue'

export const StickerData = defineCanvasComponent('sticker-data', {
  emoji: field.string().max(8).default('😀'),
})
