import { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { Snapshot } from './History'
import type { State } from './State'
import { Block, Color, Persistent, Selected } from './components'
import * as sys from './systems'
import type {
  BaseResources,
  CoreCommandArgs,
  CoreResources,
  EmitterEvents,
  ICommands,
  IStore,
  SendCommandFn,
} from './types'
import { CoreCommand } from './types'
import './elements'
import type { Component } from './Component'

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
      applySnapshot: (...snapshots: Snapshot[]) => void
      addBlock: (block: Partial<Block>, components: Component[]) => void
      setColor: (blockId: string, color: Color) => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      blockById: (id: string) => ReadonlySignal<Block | undefined>
      textById: (id: string) => ReadonlySignal<Text | undefined>
      colorById: (id: string) => ReadonlySignal<Color | undefined>
    }
  }
}

export class CoreExtension extends BaseExtension {
  public name = 'core'

  constructor(
    private readonly emitter: Emitter<EmitterEvents>,
    private readonly state: State,
  ) {
    super()
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Block)
    ComponentRegistry.instance.registerComponent(Selected)
    ComponentRegistry.instance.registerComponent(Color)
    ComponentRegistry.instance.registerComponent(Persistent)

    const menuContainer = document.createElement('div')
    menuContainer.style.pointerEvents = 'none'
    menuContainer.style.userSelect = 'none'
    menuContainer.style.transformOrigin = '0 0'
    // establish a stacking context
    menuContainer.style.transform = 'translate(0, 0) scale(1)'
    menuContainer.style.position = 'relative'
    resources.domElement.append(menuContainer)

    const coreResources: CoreResources = {
      ...resources,
      emitter: this.emitter,
      state: this.state,
      menuContainer,
    }

    this._preInputGroup = System.group(
      sys.PreInputCommandSpawner,
      { resources: coreResources },
      sys.PreInputFrameCounter,
      {
        resources: coreResources,
      },
    )

    this._preCaptureGroup = System.group(sys.PreCaptureIntersect, { resources: coreResources })

    this._captureGroup = System.group(sys.CaptureCursor, {
      resources: coreResources,
    })
    this._preUpdateGroup = System.group(sys.PreUpdateEdited, { resources: coreResources })
    this._updateGroup = System.group(
      sys.UpdateCursor,
      { resources: coreResources },
      sys.UpdateBlocks,
      { resources: coreResources },
      sys.UpdateCamera,
      { resources: coreResources },
    )

    this._postUpdateGroup = System.group(sys.PostUpdateDeleter, { resources: coreResources }, sys.PostUpdateHistory, {
      resources: coreResources,
    })

    this._preRenderGroup = System.group(
      sys.PreRenderStoreSync,
      { resources: coreResources },
      sys.PreRenderFloatingMenus,
      { resources: coreResources },
    )

    this._renderGroup = System.group(sys.RenderHtml, {
      resources: coreResources,
    })
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
        applySnapshot: (snapshot: Snapshot) => send(CoreCommand.ApplySnapshot, snapshot),
        addBlock: (block: Partial<Block>, components: Component[]) => {
          if (!block.id) {
            block.id = crypto.randomUUID()
          }
          const snapshot: Snapshot = {
            [block.id]: {
              Block: block,
            },
          }
          for (const component of components) {
            const componentName = component.constructor.name
            snapshot[block.id][componentName] = component.serialize()
          }
          send(CoreCommand.AddBlock, snapshot)
        },
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
      core: {
        blockCount: computed(() => Object.keys(state.getComponents(Persistent).value).length),
        selectedBlockCount: computed(() => Object.keys(state.getComponents(Selected).value).length),
        selectedBlockIds: computed(() => {
          const selected = state.getComponents(Selected).value
          return Object.keys(selected)
        }),
        blockById: (id: string): ReadonlySignal<Block | undefined> =>
          computed(() => state.getComponents(Block).value[id]?.value),
        textById: (id: string): ReadonlySignal<Text | undefined> =>
          computed(() => state.getComponents(Text).value[id]?.value),
        colorById: (id: string): ReadonlySignal<Color | undefined> =>
          computed(() => state.getComponents(Color).value[id]?.value),
      },
    }
  }
}
