import { System } from '@lastolivegames/becsy'
import type { Emitter } from 'strict-event-emitter'

import { Extension } from './Extension'
import type { Store } from './Store'
import * as sys from './systems'
import type { BlockCommandArgs, BlockModel, EmitterEvents, ICommands, Resources, SendCommandFn, Tool } from './types'
import { BlockCommand } from './types'

// import { type CoreResources, EmitterEventKind, type EmitterEvents, type ICommands, Options } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    block: {
      /**
       * Add a new block to the canvas
       * @param block The block model to add
       * @example editor.commands.block.addBlock({ id: 'block1', x: 100, y: 100, width: 200, height: 200 })
       */
      addBlock: (block: Partial<BlockModel>) => void

      /**
       * Set the tool for block operations
       * @param tool The tool to set
       * @param block Optionally provide a block to set with the tool
       * @example editor.commands.block.setTool(Tool.Select)
       * @example editor.commands.block.setTool(Tool.Draw, { id: 'block2' })
       */
      setTool: (tool: Tool) => void

      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
    }
  }
}

export class CoreExtension extends Extension {
  public name = 'core'

  constructor(
    private readonly emitter: Emitter<EmitterEvents>,
    public readonly store: Store,
  ) {
    super()
  }

  public async initialize(resources: Resources): Promise<void> {
    const coreResources = {
      ...resources,
      emitter: this.emitter,
      store: this.store,
    }

    this._preInputGroup = System.group(
      sys.CommandSpawner,
      { resources: coreResources },
      // sys.StoreSync,
      // { resources: coreResources },
      sys.PreInputFrameCounter,
      { resources: coreResources },
    )

    this._preCaptureGroup = System.group(sys.PreCaptureIntersect, { resources: coreResources })

    this._captureGroup = System.group(sys.CaptureCursor, {
      resources: coreResources,
    })
    this._updateGroup = System.group(
      sys.UpdateRanks,
      { resources: coreResources },
      sys.UpdateCursor,
      { resources: coreResources },
      sys.UpdateBlocks,
      { resources: coreResources },
      sys.UpdateCamera,
      { resources: coreResources },
    )

    this._postUpdateGroup = System.group(sys.Deleter, { resources: coreResources })

    // this.createStore<Block[]>([])}
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<BlockModel>) => send(BlockCommand.AddBlock, block),
        setTool: (tool: Tool) => send(BlockCommand.SetTool, tool),
        moveCamera: (x: number, y: number) => send(BlockCommand.MoveCamera, x, y),
        setZoom: (zoom: number) => send(BlockCommand.SetZoom, zoom),
      },
    }
  }
}
