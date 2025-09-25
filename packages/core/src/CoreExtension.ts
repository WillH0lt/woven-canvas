import type { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'

import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { Snapshot } from './History'
import { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuButtonColor } from './buttonCatalog'
import { CoreCommand, type CoreCommandArgs } from './commands'
import { Block, Color, Connector, Controls, Edited, Hovered, Persistent, Selected, Text } from './components'
import { HAND_CURSOR, SELECT_CURSOR } from './constants'
import { createSnapshot } from './helpers'
import * as sys from './systems'
import {} from './textUtils'
import {
  type BaseResources,
  CoreOptions,
  type CoreOptionsInput,
  type CoreResources,
  type EmitterEvents,
  FloatingMenuButton,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type SerializablePropNames,
} from './types'

type BlockData = Pick<Block, SerializablePropNames<Block>>
type ColorData = Pick<Color, SerializablePropNames<Color>>
type TextData = Pick<Text, SerializablePropNames<Text>>
type ControlsData = Pick<Controls, SerializablePropNames<Controls>>

declare module '@infinitecanvas/core' {
  interface ICommands {
    core: {
      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
      undo: () => void
      redo: () => void
      createCheckpoint: () => void
      bringForwardSelected: () => void
      sendBackwardSelected: () => void
      deselectAll: () => void
      duplicateSelected: () => void
      removeSelected: () => void
      updateBlock: (blockId: string, block: Partial<BlockData>) => void
      addBlock: (block: Partial<BlockData>, components: BaseComponent[]) => void
      setControls: (controls: Partial<ControlsData>) => void
      setColor: (blockId: string, color: Partial<ColorData>) => void
      applyColorToSelected: (color: ColorData) => void
      createAndDragOntoCanvas: (snapshot: Snapshot) => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      hoveredBlockId: ReadonlySignal<string | null>
      blockById: (id: string) => ReadonlySignal<Block | undefined>
      colorById: (id: string) => ReadonlySignal<Color | undefined>
      textById: (id: string) => ReadonlySignal<Text | undefined>
      controls: ReadonlySignal<Controls | undefined>
    }
  }
}

export class CoreExtension extends BaseExtension {
  public readonly floatingMenus = [
    {
      component: Color,
      buttons: [FloatingMenuButton.parse(floatingMenuButtonColor)],
    },
  ]

  public readonly tools = [
    {
      name: 'select',
      buttonTag: 'ic-select-tool',
      buttonTooltip: 'Select',
      cursorIcon: SELECT_CURSOR,
    },
    {
      name: 'hand',
      buttonTag: 'ic-hand-tool',
      buttonTooltip: 'Hand',
      cursorIcon: HAND_CURSOR,
    },
    {
      name: 'text',
      buttonTag: 'ic-text-tool',
      buttonTooltip: 'Text',
    },
  ]

  private readonly options: CoreOptions
  private readonly emitter: Emitter<EmitterEvents>
  private readonly state: State
  private initialEntities: Snapshot = {}
  private blockContainer: HTMLDivElement | null = null

  constructor(emitter: Emitter<EmitterEvents>, state: State, options: CoreOptionsInput) {
    super()
    this.emitter = emitter
    this.state = state
    this.options = CoreOptions.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Block)
    ComponentRegistry.instance.registerComponent(Color)
    ComponentRegistry.instance.registerComponent(Edited)
    ComponentRegistry.instance.registerComponent(Selected)
    ComponentRegistry.instance.registerComponent(Hovered)
    ComponentRegistry.instance.registerComponent(Persistent)
    ComponentRegistry.instance.registerComponent(Connector)

    ComponentRegistry.instance.registerSingleton(Controls)

    this.blockContainer = resources.blockContainer

    const menuContainer = document.createElement('div')
    menuContainer.style.pointerEvents = 'none'
    menuContainer.style.userSelect = 'none'
    menuContainer.style.transformOrigin = '0 0'
    // establish a stacking context
    menuContainer.style.transform = 'translate(0, 0) scale(1)'
    menuContainer.style.position = 'relative'
    resources.domElement.append(menuContainer)

    const localDB = await LocalDB.New(this.options.persistenceKey)
    this.initialEntities = await localDB.getAll()

    const coreResources: CoreResources = {
      ...resources,
      ...this.options,
      emitter: this.emitter,
      state: this.state,
      menuContainer,
      localDB,
    }

    this.preInputGroup = this.createGroup(coreResources, sys.PreInputCommandSpawner, sys.PreInputFrameCounter)
    this.inputGroup = this.createGroup(
      coreResources,
      sys.InputScreen,
      sys.InputPointer,
      sys.InputKeyboard,
      sys.InputMouse,
    )

    this.preCaptureGroup = this.createGroup(coreResources, sys.PreCaptureIntersect, sys.PreCaptureSelect)
    this.captureGroup = this.createGroup(
      coreResources,
      sys.CaptureBlockPlacement,
      sys.CaptureTransformBox,
      sys.CaptureHoverCursor,
      sys.CaptureKeyboard,
    )
    this.preUpdateGroup = this.createGroup(coreResources, sys.PreUpdateEdited, sys.PreUpdateUndoRedo)
    this.updateGroup = this.createGroup(
      coreResources,
      sys.UpdateBlocks,
      sys.UpdateCamera,
      sys.UpdateSelection,
      sys.UpdateTransformBox,
      sys.UpdateDragHandler,
    )
    this.postUpdateGroup = this.createGroup(coreResources, sys.PostUpdateDeleter, sys.PostUpdateHistory)
    this.preRenderGroup = this.createGroup(coreResources, sys.PreRenderStoreSync, sys.PreRenderFloatingMenus)
    this.renderGroup = this.createGroup(coreResources, sys.RenderHtml, sys.RenderBackground)
  }

  public build(worldSystem: System, resources: BaseResources): void {
    for (const [_, entity] of Object.entries(this.initialEntities)) {
      const args = []

      const tag = entity.Block.tag
      const components = resources.blockDefs[tag as string]?.components

      if (!components) {
        console.warn(
          `Local storage tried to load a block with tag "${tag}" but no block definitions were found for it.`,
        )
        continue
      }

      for (const component of [Block, ...components]) {
        const model = entity[component.name] || {}
        const instance = new component().fromJson(model)
        args.push(component, instance)
      }

      // @ts-ignore
      worldSystem.createEntity(...args, Persistent)
    }

    // clear initialEntities to save on memory
    this.initialEntities = {}
  }

  public addCommands = (send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      core: {
        moveCamera: (x: number, y: number) => send(CoreCommand.MoveCamera, { x, y }),
        setZoom: (zoom: number) => send(CoreCommand.SetZoom, { zoom }),
        undo: () => send(CoreCommand.Undo),
        redo: () => send(CoreCommand.Redo),
        createCheckpoint: () => send(CoreCommand.CreateCheckpoint),
        bringForwardSelected: () => send(CoreCommand.BringForwardSelected),
        sendBackwardSelected: () => send(CoreCommand.SendBackwardSelected),
        deselectAll: () => send(CoreCommand.DeselectAll),
        duplicateSelected: () => send(CoreCommand.DuplicateSelected),
        removeSelected: () => send(CoreCommand.RemoveSelected),
        updateBlock: (blockId: string, block: Partial<BlockData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Block: block,
            },
          })
        },
        addBlock: (block: Partial<BlockData>, components: BaseComponent[]) => {
          const snapshot = createSnapshot(new Block(block), components)
          send(CoreCommand.CreateFromSnapshot, snapshot)
        },
        setControls: (controls: Partial<ControlsData>) => send(CoreCommand.SetControls, controls),
        setColor: (blockId: string, color: Partial<ColorData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Color: new Color(color).toJson(),
            },
          })
        },
        applyColorToSelected: (color: ColorData) => {
          const selectedIds = this.state.getComponents(Selected).value
          if (Object.keys(selectedIds).length === 0) return

          const snapshot: Snapshot = {}
          for (const id of Object.keys(selectedIds)) {
            snapshot[id] = {
              Color: color,
            }
          }
          send(CoreCommand.UpdateFromSnapshot, snapshot)
        },
        createAndDragOntoCanvas: (snapshot: Snapshot) => {
          send(CoreCommand.CreateAndDragOntoCanvas, snapshot)
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      core: {
        blockCount: computed(() => Object.keys(state.getComponents(Persistent).value).length),
        selectedBlockCount: computed(() => Object.keys(state.getComponents(Selected).value).length),
        selectedBlockIds: computed(() => {
          const selected = state.getComponents(Selected).value
          return Object.keys(selected)
        }),
        hoveredBlockId: computed(() => {
          const hovered = state.getComponents(Hovered).value
          const ids = Object.keys(hovered)
          return ids.length > 0 ? ids[0] : null
        }),
        blockById: (id: string): ReadonlySignal<Block | undefined> =>
          computed(() => state.getComponent<Block>(Block, id).value),
        colorById: (id: string): ReadonlySignal<Color | undefined> =>
          computed(() => state.getComponent<Color>(Color, id).value),
        controls: computed(() => state.getSingleton(Controls).value),
        textById: (id: string): ReadonlySignal<Text | undefined> =>
          computed(() => state.getComponent<Text>(Text, id).value),
      },
    }
  }
}
