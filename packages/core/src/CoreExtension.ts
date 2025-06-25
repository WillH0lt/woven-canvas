import { System } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'

import { type ReadonlySignal, computed } from '@preact/signals-core'
import { Extension } from './Extension'
import type { State } from './State'
import { Block, Selected } from './components'
import * as sys from './systems'
import type { BlockCommandArgs, BlockModel, EmitterEvents, ICommands, IStore, Resources, SendCommandFn } from './types'
import { BlockCommand } from './types'

// import { type CoreResources, EmitterEventKind, type EmitterEvents, type ICommands, Options } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    block: {
      addBlock: (block: Partial<BlockModel>) => void
      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
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

  constructor(
    private readonly emitter: Emitter<EmitterEvents>,
    public readonly state: State,
  ) {
    super()
  }

  public async initialize(resources: Resources): Promise<void> {
    const coreResources = {
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

    this._postUpdateGroup = System.group(sys.PostUpdateDeleter, { resources: coreResources })

    this._postRenderGroup = System.group(sys.PostRenderStoreSync, {
      resources: coreResources,
    })
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<BlockModel>) => send(BlockCommand.AddBlock, block),
        moveCamera: (x: number, y: number) => send(BlockCommand.MoveCamera, x, y),
        setZoom: (zoom: number) => send(BlockCommand.SetZoom, zoom),
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
