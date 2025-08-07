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
} from '@infinitecanvas/core'
import { Text, TextEditorFloatingMenuButtons } from '@infinitecanvas/extension-text'
import { type ReadonlySignal, computed } from '@preact/signals-core'

import './elements'
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
  public static blockDefs = [
    {
      tag: 'ic-rough-shape',
      canEdit: true,
      resizeMode: 'free' as const,
      floatingMenu: [...roughShapeFloatingMenuButtons, ...floatingMenuStandardButtons],
      editedFloatingMenu: TextEditorFloatingMenuButtons,
      components: [Text, RoughShape],
    },
  ]

  public static dependsOn = ['ColorExtension', 'TextExtension']

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
