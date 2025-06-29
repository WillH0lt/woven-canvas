import { System } from '@lastolivegames/becsy'
import { type ReadonlySignal, computed } from '@preact/signals-core'
import type { Emitter } from 'strict-event-emitter'

import { ComponentRegistry } from './ComponentRegistry'
import { Extension } from './Extension'
import { LocalDB } from './LocalDB'
import type { State } from './State'
import { Block, Persistent, Selected } from './components'
import * as sys from './systems'
import type { BlockCommandArgs, BlockModel, EmitterEvents, ICommands, IStore, Resources, SendCommandFn } from './types'
import { BlockCommand, CoreOptions } from './types'

// import { type CoreResources, EmitterEventKind, type EmitterEvents, type ICommands, Options } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    block: {
      addBlock: (block: Partial<BlockModel>) => void
      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
      undo: () => void
      redo: () => void
      createCheckpoint: () => void
    }
  }

  interface IStore {
    block: {
      blockCount: ReadonlySignal<number>
      selectedBlockCount: ReadonlySignal<number>
      selectedBlockIds: ReadonlySignal<string[]>
      blockById: (id: string) => ReadonlySignal<BlockModel | undefined>
    }
  }
}

export class CoreExtension extends Extension {
  public name = 'core'

  private initialEntities: Record<string, any> = {}

  constructor(
    private readonly options: CoreOptions,
    private readonly emitter: Emitter<EmitterEvents>,
    private readonly state: State,
    // private readonly localDB: LocalDB,
  ) {
    super()
  }

  public async preBuild(resources: Resources): Promise<void> {
    const options = CoreOptions.parse(this.options)
    const localDB = await LocalDB.New(options.persistenceKey)
    this.initialEntities = await localDB.getAll()

    ComponentRegistry.instance.registerHistoryComponent(Block)

    ComponentRegistry.instance.registerStateComponent(Block)
    ComponentRegistry.instance.registerStateComponent(Selected)

    const coreResources = {
      ...resources,
      emitter: this.emitter,
      state: this.state,
      localDB,
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

    this._postRenderGroup = System.group(sys.PostRenderStoreSync, {
      resources: coreResources,
    })
  }

  public build(worldSystem: System): void {
    const componentNames = new Map(ComponentRegistry.instance.historyComponents.map((c) => [c.name, c]))

    for (const [id, entity] of Object.entries(this.initialEntities)) {
      const args = []
      for (const [componentName, model] of Object.entries(entity)) {
        const Component = componentNames.get(componentName)
        if (!Component) continue
        args.push(Component, model)
      }

      // @ts-ignore
      worldSystem.createEntity(...args, Persistent, { id })
    }

    this.initialEntities = {}
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<BlockModel>) => send(BlockCommand.AddBlock, block),
        moveCamera: (x: number, y: number) => send(BlockCommand.MoveCamera, x, y),
        setZoom: (zoom: number) => send(BlockCommand.SetZoom, zoom),
        undo: () => send(BlockCommand.Undo),
        redo: () => send(BlockCommand.Redo),
        createCheckpoint: () => send(BlockCommand.CreateCheckpoint),
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      block: {
        blockCount: computed(() => Object.keys(state.getComponents(Block).value).length),
        selectedBlockCount: computed(() => Object.keys(state.getComponents(Selected).value).length),
        selectedBlockIds: computed(() => {
          const selected = state.getComponents(Selected).value
          return Object.keys(selected)
        }),
        blockById: (id: string): ReadonlySignal<BlockModel | undefined> =>
          computed(() => state.getComponents(Block).value[id]?.value),
      },
    }
  }
}
