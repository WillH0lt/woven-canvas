import {
  type BaseComponent,
  BaseExtension,
  CoreCommand,
  type CoreCommandArgs,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type Snapshot,
  type State,
} from '@infinitecanvas/core'
import { Selected, Text, VerticalAlign } from '@infinitecanvas/core/components'
import { type ReadonlySignal, computed } from '@preact/signals-core'

import './webComponents'
import { roughShapeFloatingMenuButtons } from './buttonCatalog'
import { RoughShape } from './components'

type RoughShapeData = Omit<RoughShape, keyof BaseComponent>

declare module '@infinitecanvas/core' {
  interface ICommands {
    roughShapes: {
      setRoughShape: (blockId: string, roughShape: Partial<RoughShapeData>) => void
      applyRoughShapeToSelection: (roughShape: Partial<RoughShapeData>) => void
    }
  }

  interface IStore {
    roughShapes: {
      roughShapeById: (id: string) => ReadonlySignal<RoughShape | undefined>
      selectedRoughShapes: ReadonlySignal<RoughShape[]>
    }
  }
}

class RoughShapesExtensionClass extends BaseExtension {
  public override readonly blocks = [
    {
      tag: 'ic-rough-shape',
      editOptions: {
        canEdit: true,
      },
      resizeMode: 'free' as const,
      components: [Text, VerticalAlign, RoughShape],
    },
  ]

  public readonly floatingMenus = [
    {
      component: RoughShape,
      buttons: roughShapeFloatingMenuButtons,
      orderIndex: 50,
    },
  ]

  public readonly tools = [
    {
      name: 'rough-shapes',
      buttonTag: 'ic-rough-shapes-tool',
      buttonTooltip: 'Shape',
    },
  ]

  public addCommands = (state: State, send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      roughShapes: {
        setRoughShape: (blockId: string, roughShape: Partial<RoughShapeData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              RoughShape: roughShape,
            },
          })
        },
        applyRoughShapeToSelection: (roughShape: Partial<RoughShapeData>) => {
          const selectedIds = state.getComponents(Selected).value
          if (Object.keys(selectedIds).length === 0) return

          const snapshot: Snapshot = {}
          for (const id of Object.keys(selectedIds)) {
            snapshot[id] = {
              RoughShape: roughShape,
            }
          }
          send(CoreCommand.UpdateFromSnapshot, snapshot)
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      roughShapes: {
        roughShapeById: (id: string): ReadonlySignal<RoughShape | undefined> =>
          computed(() => state.getComponent<RoughShape>(RoughShape, id).value),
        selectedRoughShapes: computed(() => {
          const selectedIds = state.getComponents(Selected).value
          const shapes: RoughShape[] = []
          for (const id of Object.keys(selectedIds)) {
            const shape = state.getComponent<RoughShape>(RoughShape, id).value
            if (shape) {
              shapes.push(shape)
            }
          }
          return shapes
        }),
      },
    }
  }
}

export const RoughShapesExtension = () => new RoughShapesExtensionClass()
