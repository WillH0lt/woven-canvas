import { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { Snapshot } from './History'
import type { State } from './State'
import { Block, Persistent, Selected } from './components'
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
import type { BaseComponent } from './BaseComponent'
import { floatingMenuStandardButtons } from './buttonCatalog'

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
      addBlock: (block: Partial<Block>, components: BaseComponent[]) => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      blockById: (id: string) => ReadonlySignal<Block | undefined>
      textById: (id: string) => ReadonlySignal<Text | undefined>
    }
  }
}

export class CoreExtension extends BaseExtension {

  public static blockDefs = [
    {
      tag: 'group',
      floatingMenu: floatingMenuStandardButtons,
    },
  ]

  constructor(
    private readonly emitter: Emitter<EmitterEvents>,
    private readonly state: State,
  ) {
    super()
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Block)
    ComponentRegistry.instance.registerComponent(Selected)
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

    this._preInputGroup = this.createGroup(coreResources, sys.PreInputCommandSpawner, sys.PreInputFrameCounter)
    this._preCaptureGroup = this.createGroup(coreResources, sys.PreCaptureIntersect)
    this._captureGroup = this.createGroup(coreResources, sys.CaptureCursor)
    this._preUpdateGroup = this.createGroup(coreResources, sys.PreUpdateEdited)
    this._updateGroup = this.createGroup(
      coreResources,
      sys.UpdateCursor,
      sys.UpdateBlocks,
      sys.UpdateCamera,
    )
    this._postUpdateGroup = this.createGroup(coreResources, sys.PostUpdateDeleter, sys.PostUpdateHistory)
    this._preRenderGroup = this.createGroup(coreResources, sys.PreRenderStoreSync, sys.PreRenderFloatingMenus)
    this._renderGroup = this.createGroup(coreResources, sys.RenderHtml)
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
        addBlock: (block: Partial<Block>, components: BaseComponent[]) => {
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
      },
    }
  }
}
