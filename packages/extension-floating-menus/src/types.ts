import type { Resources } from '@infinitecanvas/core'
import { z } from 'zod'

export const Button = z.object({
  tag: z.string(),
  width: z.number().default(50),
  tooltip: z.string().optional(),
})

const bringForwardButton: z.infer<typeof Button> = {
  tag: 'ic-bring-forward-button',
  width: 40,
  tooltip: 'Bring Forward',
}

const sendBackwardButton: z.infer<typeof Button> = {
  tag: 'ic-send-backward-button',
  width: 40,
  tooltip: 'Send Backward',
}

const duplicateButton: z.infer<typeof Button> = {
  tag: 'ic-duplicate-button',
  width: 40,
  tooltip: 'Duplicate',
}

const deleteButton: z.infer<typeof Button> = {
  tag: 'ic-delete-button',
  width: 40,
  tooltip: 'Delete',
}

export const FloatingMenusOptions = z.object({
  menus: z
    .array(
      z.object({
        blockKind: z.string(),
        buttons: z.array(Button),
      }),
    )
    .default([
      {
        blockKind: 'group',
        buttons: [bringForwardButton, sendBackwardButton, duplicateButton, deleteButton],
      },
      {
        blockKind: 'ic-shape',
        buttons: [bringForwardButton, sendBackwardButton, duplicateButton, deleteButton],
      },
      {
        blockKind: 'ic-text',
        buttons: [bringForwardButton, sendBackwardButton, duplicateButton, deleteButton],
      },
    ]),
})

export interface FloatingMenusResources extends Resources {
  viewport: HTMLDivElement
  options: z.infer<typeof FloatingMenusOptions>
}
