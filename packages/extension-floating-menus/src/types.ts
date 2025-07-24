import type { BaseResources } from '@infinitecanvas/core'
import { z } from 'zod'
import { defaultFloatingMenus } from './buttonCatelog'

export const Button = z.object({
  tag: z.string(),
  tooltip: z.string().default(''),
  menu: z.string().default(''),
  width: z.number().default(40),
})

export type Button = z.input<typeof Button>

const ThemeSchema = z.object({
  gray100: z.string().default('#f8f9f9'),
  gray200: z.string().default('#e3e5e8'),
  gray300: z.string().default('#c7ccd1'),
  gray400: z.string().default('#9099a4'),
  gray500: z.string().default('#4f5660'),
  gray600: z.string().default('#2e3338'),
  gray700: z.string().default('#060607'),
  primaryColor: z.string().default('#6a58f2'),

  borderRadius: z.string().default('12px'),
  tooltipBorderRadius: z.string().default('6px'),
  transitionDuration: z.string().default('150ms'),
  transitionTimingFunction: z.string().default('cubic-bezier(0.4, 0, 0.2, 1)'),
})

export const FloatingMenusOptions = z.object({
  menus: z
    .array(
      z.object({
        blockKind: z.string(),
        buttons: z.array(Button),
      }),
    )
    .default(defaultFloatingMenus),
  theme: ThemeSchema.default(ThemeSchema.parse({})),
})

export type FloatingMenusOptions = z.input<typeof FloatingMenusOptions>

export interface FloatingMenusResources extends BaseResources {
  viewport: HTMLDivElement
  options: z.infer<typeof FloatingMenusOptions>
}
