import {
  BaseExtension,
  type BaseResources,
  ComponentRegistry,
  CoreCommand,
  type CoreCommandArgs,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
} from '@infinitecanvas/core'
import { type ReadonlySignal, computed } from '@preact/signals-core'

import { Color } from './components'
import './elements'

declare module '@infinitecanvas/core' {
  interface ICommands {
    color: {
      setColor: (blockId: string, color: Color) => void
    }
  }

  interface IStore {
    color: {
      colorById: (id: string) => ReadonlySignal<Color | undefined>
    }
  }
}

class ColorExtensionClass extends BaseExtension {
  public async preBuild(_resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Color)
  }

  public addCommands = (send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      color: {
        setColor: (blockId: string, color: Color) => {
          send(CoreCommand.ApplySnapshot, {
            [blockId]: {
              Color: color.serialize(),
            },
          })
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      color: {
        colorById: (id: string): ReadonlySignal<Color | undefined> =>
          computed(() => state.getComponents(Color).value[id]?.value),
      },
    }
  }
}

export const ColorExtension = () => new ColorExtensionClass()
