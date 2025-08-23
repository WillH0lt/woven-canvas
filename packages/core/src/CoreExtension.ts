import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'

import type { System } from '@lastolivegames/becsy'
import type { BaseComponent } from './BaseComponent'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { Snapshot } from './History'
import { LocalDB } from './LocalDB'
import type { State } from './State'
import { floatingMenuStandardButtons } from './buttonCatalog'
import { Block, Controls, Hovered, Persistent, Selected } from './components'
import { HAND_CURSOR, SELECT_CURSOR } from './constants'
import { getSnapshot } from './helpers'
import * as sys from './systems'
import {
  type BaseResources,
  type CoreCommandArgs,
  CoreOptions,
  type CoreOptionsInput,
  type CoreResources,
  type EmitterEvents,
  type ICommands,
  type IStore,
  type NonFunctionPropNames,
  type SendCommandFn,
} from './types'
import { CoreCommand } from './types'

type BlockData = Pick<Block, NonFunctionPropNames<Block>>
type ControlsData = Pick<Controls, NonFunctionPropNames<Controls>>

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
      duplicateSelected: () => void
      removeSelected: () => void
      updateBlock: (blockId: string, block: Partial<BlockData>) => void
      addBlock: (block: Partial<BlockData>, components: BaseComponent[]) => void
      setControls: (controls: Partial<ControlsData>) => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      hoveredBlockId: ReadonlySignal<string | null>
      blockById: (id: string) => ReadonlySignal<Block | undefined>
      controls: ReadonlySignal<Controls | undefined>
    }
  }
}

export class CoreExtension extends BaseExtension {
  public static blocks = [
    {
      tag: 'group',
      floatingMenu: floatingMenuStandardButtons,
    },
  ]

  public static tools = [
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
  ]

  private readonly options: CoreOptions
  private readonly emitter: Emitter<EmitterEvents>
  private readonly state: State
  private initialEntities: Snapshot = {}

  constructor(emitter: Emitter<EmitterEvents>, state: State, options: CoreOptionsInput) {
    super()
    this.emitter = emitter
    this.state = state
    this.options = CoreOptions.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Block)
    ComponentRegistry.instance.registerComponent(Selected)
    ComponentRegistry.instance.registerComponent(Hovered)
    ComponentRegistry.instance.registerComponent(Persistent)

    ComponentRegistry.instance.registerSingleton(Controls)

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

    this._preInputGroup = this.createGroup(coreResources, sys.PreInputCommandSpawner, sys.PreInputFrameCounter)
    this._preCaptureGroup = this.createGroup(coreResources, sys.PreCaptureIntersect)
    this._captureGroup = this.createGroup(coreResources, sys.CaptureBlockPlacement)
    this._preUpdateGroup = this.createGroup(coreResources, sys.PreUpdateEdited)
    this._updateGroup = this.createGroup(coreResources, sys.UpdateCursor, sys.UpdateBlocks, sys.UpdateCamera)
    this._postUpdateGroup = this.createGroup(coreResources, sys.PostUpdateDeleter, sys.PostUpdateHistory)
    this._preRenderGroup = this.createGroup(coreResources, sys.PreRenderStoreSync, sys.PreRenderFloatingMenus)
    this._renderGroup = this.createGroup(coreResources, sys.RenderHtml)
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
          const snapshot = getSnapshot(new Block(block), components)
          send(CoreCommand.CreateFromSnapshot, snapshot)
        },
        setControls: (controls: Partial<ControlsData>) => send(CoreCommand.SetControls, controls),
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
        controls: computed(() => state.getSingleton(Controls).value),
      },
    }
  }
}
