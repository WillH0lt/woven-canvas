import { z } from 'zod/v4'

import type { Resources } from '@infinitecanvas/core'
import type { LocalDB } from './LocalDB'

export const LocalStorageOptions = z.object({
  persistenceKey: z.string().default('default'),
})

export type LocalStorageOptions = z.input<typeof LocalStorageOptions>

export interface LocalStorageResources extends Resources {
  localDB: LocalDB
}
