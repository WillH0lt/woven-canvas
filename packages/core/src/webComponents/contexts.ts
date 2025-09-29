import { createContext } from '@lit/context'

import type { ICommands, IConfig, IStore } from '../types'

export const storeContext = createContext<IStore>('store')

export const commandsContext = createContext<ICommands>('commands')

export const configContext = createContext<IConfig>('config')
