import type { BlockModel, ICommands, Resources, SendCommandFn } from '@infinitecanvas/core'
import { Extension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'
import { BlockCommand, type BlockCommandArgs } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    block: {
      /**
       * Set the text color
       * @param color The color to set
       * @example editor.commands.setColor('red')
       */
      addBlock: (block: Partial<BlockModel>) => void

      /**
       * Remove the selected blocks
       * @example editor.commands.removeSelected()
       */
      removeSelected: () => void
    }
  }
}

export class BlockExtension extends Extension {
  public name = 'block'

  public async initialize(resources: Resources): Promise<void> {
    this._captureGroup = System.group(sys.CaptureSelection, { resources })
    this._updateGroup = System.group(
      sys.UpdateSelection,
      { resources },
      sys.UpdateTransformBox,
      { resources },
      sys.UpdateRanks,
      { resources },
    )

    console.log('BlockExtension initialized', sys)

    // this.createStore<Block[]>([])}
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<BlockModel>) => send(BlockCommand.AddBlock, block),
        removeSelected: () => send(BlockCommand.RemoveSelected),
      },
    }
  }
}
