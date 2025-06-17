import type { BlockModel, ICommands, Resources, SendCommandFn } from '@infinitecanvas/core'
import { Extension, type Tool } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'
import { BlockCommand, type BlockCommandArgs } from './types'

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
       * Remove the selected blocks
       * @example editor.commands.block.removeSelected()
       */
      removeSelected: () => void

      /**
       * Set the tool for block operations
       * @param tool The tool to set
       * @param block Optionally provide a block to set with the tool
       * @example editor.commands.block.setTool(Tool.Select)
       * @example editor.commands.block.setTool(Tool.Draw, { id: 'block2' })
       */
      setTool: (tool: Tool, block?: Partial<BlockModel>) => void
    }
  }
}

export class BlockExtension extends Extension {
  public name = 'block'

  public async initialize(resources: Resources): Promise<void> {
    this._preCaptureGroup = System.group(sys.PreCaptureIntersect, { resources })

    this._captureGroup = System.group(
      sys.CaptureSelection,
      { resources },
      sys.CaptureTransformBox,
      { resources },
      sys.CaptureCursor,
      { resources },
    )
    this._updateGroup = System.group(
      sys.UpdateSelection,
      { resources },
      sys.UpdateTransformBox,
      { resources },
      sys.UpdateRanks,
      { resources },
      sys.UpdateCursor,
      { resources },
    )

    // this.createStore<Block[]>([])}
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<BlockModel>) => send(BlockCommand.AddBlock, block),
        removeSelected: () => send(BlockCommand.RemoveSelected),
        setTool: (tool: Tool, block: Partial<BlockModel> = {}) => send(BlockCommand.SetTool, tool, block),
      },
    }
  }
}
