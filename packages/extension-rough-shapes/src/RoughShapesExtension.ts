import {
  type BaseComponent,
  BaseExtension,
  CoreCommand,
  type CoreCommandArgs,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
  floatingMenuStandardButtons,
  textEditorFloatingMenuButtons,
} from '@infinitecanvas/core'
import { Text } from '@infinitecanvas/core/components'
import { type ReadonlySignal, computed } from '@preact/signals-core'

import './webComponents'
import { roughShapeFloatingMenuButtons } from './buttonCatalog'
import { RoughShape } from './components'

type RoughShapeData = Omit<RoughShape, keyof BaseComponent>

declare module '@infinitecanvas/core' {
  interface ICommands {
    roughShapes: {
      setRoughShape: (blockId: string, roughShape: Partial<RoughShapeData>) => void
    }
  }

  interface IStore {
    roughShapes: {
      roughShapeById: (id: string) => ReadonlySignal<RoughShape | undefined>
    }
  }
}

class RoughShapesExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-rough-shape',
      canEdit: true,
      resizeMode: 'free' as const,
      floatingMenu: [...roughShapeFloatingMenuButtons, ...floatingMenuStandardButtons],
      editedFloatingMenu: textEditorFloatingMenuButtons,
      components: [Text, RoughShape],
    },
  ]

  public readonly tools = [
    {
      name: 'rough-shapes',
      buttonTag: 'ic-rough-shapes-tool',
      buttonTooltip: 'Shape',
    },
  ]

  public addCommands = (send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      roughShapes: {
        setRoughShape: (blockId: string, roughShape: Partial<RoughShapeData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              RoughShape: roughShape,
            },
          })
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      roughShapes: {
        roughShapeById: (id: string): ReadonlySignal<RoughShape | undefined> =>
          computed(() => state.getComponent<RoughShape>(RoughShape, id).value),
      },
    }
  }
}

export const RoughShapesExtension = () => new RoughShapesExtensionClass()
