import type { Block, ICommands, Resources, SendCommandFn } from '@infinitecanvas/core'
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
      addBlock: (block: Partial<Block>) => void
    }
  }
}

export class BlockExtension extends Extension {
  public name = 'block'

  public async initialize(resources: Resources): Promise<void> {
    this._captureGroup = System.group(sys.CaptureSelection, { resources })
    this._updateGroup = System.group(sys.UpdateBlocks, { resources })

    // this.createStore<Block[]>([])
  }

  public addCommands = (send: SendCommandFn<BlockCommandArgs>): Partial<ICommands> => {
    return {
      block: {
        addBlock: (block: Partial<Block>) => send(BlockCommand.AddBlock, block),
      },
    }
  }
}
