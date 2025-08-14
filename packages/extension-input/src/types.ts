import type { BaseResources } from '@infinitecanvas/core'
import { z } from 'zod'

import { defaultKeybinds } from './constants'

const keybind = z.object({
  command: z.string(),
  key: z.string(),
  mod: z.boolean().optional(),
  shift: z.boolean().optional(),
})

export const InputOptions = z.object({
  keybinds: z.array(keybind).default(defaultKeybinds),
})

export type InputOptions = z.infer<typeof InputOptions>
export type InputOptionsInput = z.input<typeof InputOptions>
export type InputResources = BaseResources & z.Infer<typeof InputOptions>
