import { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import type { State } from './State'
import { Block, Persistent, Selected, Shape, Text } from './components'
import * as sys from './systems'
import type {
  BaseResources,
  BlockModel,
  CoreCommandArgs,
  CoreResources,
  EmitterEvents,
  ICommands,
  IStore,
  SendCommandFn,
  ShapeModel,
  TextModel,
} from './types'
import { CoreCommand } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    core: {
      addShape: (block: Omit<Partial<BlockModel>, 'tag'>, shape: Partial<ShapeModel>) => void
      addText: (
        block: Omit<Partial<BlockModel>, 'tag' | 'stretchableHeight' | 'stretchableWidth'>,
        text: Partial<TextModel>,
      ) => void
      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
      undo: () => void
      redo: () => void
      createCheckpoint: () => void
      bringForwardSelected: () => void
      sendBackwardSelected: () => void
      duplicateSelected: () => void
      removeSelected: () => void
    }
  }

  interface IStore {
    core: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      blockById: (id: string) => ReadonlySignal<BlockModel | undefined>
      textById: (id: string) => ReadonlySignal<TextModel | undefined>
      shapeById: (id: string) => ReadonlySignal<ShapeModel | undefined>
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
    // const options = CoreOptions.parse(this.options)

    ComponentRegistry.instance.registerHistoryComponent(Block)
    ComponentRegistry.instance.registerHistoryComponent(Text)
    ComponentRegistry.instance.registerHistoryComponent(Shape)

    ComponentRegistry.instance.registerStateComponent(Block)
    ComponentRegistry.instance.registerStateComponent(Selected)
    ComponentRegistry.instance.registerStateComponent(Text)
    ComponentRegistry.instance.registerStateComponent(Shape)
    ComponentRegistry.instance.registerStateComponent(Persistent)

    const coreResources: CoreResources = {
      ...resources,
      emitter: this.emitter,
      state: this.state,
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

    this._preRenderGroup = System.group(sys.PreRenderStoreSync, {
      resources: coreResources,
    })
  }

  public addCommands = (send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      core: {
        addShape: (block: Partial<BlockModel>, shape: Partial<ShapeModel>) => send(CoreCommand.AddShape, block, shape),
        addText: (block: Partial<BlockModel>, text: Partial<TextModel>) => send(CoreCommand.AddText, block, text),
        moveCamera: (x: number, y: number) => send(CoreCommand.MoveCamera, { x, y }),
        setZoom: (zoom: number) => send(CoreCommand.SetZoom, { zoom }),
        undo: () => send(CoreCommand.Undo),
        redo: () => send(CoreCommand.Redo),
        createCheckpoint: () => send(CoreCommand.CreateCheckpoint),
        bringForwardSelected: () => send(CoreCommand.BringForwardSelected),
        sendBackwardSelected: () => send(CoreCommand.SendBackwardSelected),
        duplicateSelected: () => send(CoreCommand.DuplicateSelected),
        removeSelected: () => send(CoreCommand.RemoveSelected),
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
        blockById: (id: string): ReadonlySignal<BlockModel | undefined> =>
          computed(() => state.getComponents(Block).value[id]?.value),
        textById: (id: string): ReadonlySignal<TextModel | undefined> =>
          computed(() => state.getComponents(Text).value[id]?.value),
        shapeById: (id: string): ReadonlySignal<ShapeModel | undefined> =>
          computed(() => state.getComponents(Shape).value[id]?.value),
      },
    }
  }
}
