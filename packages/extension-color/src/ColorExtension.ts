import {
  type BaseComponent,
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
import './webComponents'

type ColorData = Omit<Color, keyof BaseComponent>

declare module '@infinitecanvas/core' {
  interface ICommands {
    color: {
      setColor: (blockId: string, color: Partial<ColorData>) => void
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
        setColor: (blockId: string, color: Partial<ColorData>) => {
          // const snapshot
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Color: new Color(color).toJson(),
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
          computed(() => state.getComponent<Color>(Color, id).value),
      },
    }
  }
}

export const ColorExtension = () => new ColorExtensionClass()
