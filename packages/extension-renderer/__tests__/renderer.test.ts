import { InfiniteCanvas } from '@infinitecanvas/core'
// import { uuidv4 as uuid } from '@infinitecanvas/utils'

import Renderer from '../src'

function createTestBlock() {
  return {
    id: `block-${Math.random().toString(36).substring(2, 15)}`,
    top: 100,
    left: 100,
    width: 200,
    height: 200,
    red: 255,
    green: 0,
    blue: 0,
    alpha: 255,
  }
}

// class TestSystem extends System {
//   private readonly screen = this.singleton.read(comps.Screen)

//   private readonly blocks = this.query((q) => q.added.and.changed.and.removed.with(comps.Block).trackWrites)

//   public execute(): void {
//     for (const blockEntity of this.blocks.added) {
//       const block = blockEntity.read(comps.Block)

//       // Create a PIXI graphics object for the block
//       const graphics = new PIXI.Graphics()
//       const color = (block.red << 16) | (block.green << 8) | block.blue
//       graphics.rect(block.left, block.top, block.width, block.height).fill(color)
//       graphics.label = block.id // Set the name to the block ID for easy retrieval

//       // Add the graphics object to the PIXI application
//       this.resources.pixiApp.stage.addChild(graphics)
//     }

//     for (const blockEntity of this.blocks.changed) {
//       const block = blockEntity.read(comps.Block)

//       // Update the existing PIXI graphics object for the block
//       const graphics = this.resources.pixiApp.stage.getChildByLabel(block.id) as PIXI.Graphics
//       if (graphics) {
//         graphics.clear()
//         const color = (block.red << 16) | (block.green << 8) | block.blue
//         graphics.rect(block.left, block.top, block.width, block.height).fill(color)
//       }
//     }

//     for (const blockEntity of this.blocks.removed) {
//       const block = blockEntity.read(comps.Block)

//       // Remove the PIXI graphics object for the block
//       const graphics = this.resources.pixiApp.stage.getChildByLabel(block.id) as PIXI.Graphics
//       if (graphics) {
//         this.resources.pixiApp.stage.removeChild(graphics)
//       }
//     }

//     // Handle domElement resizing
//     if (this.screen.resizedTrigger) {
//       const { clientWidth, clientHeight } = this.resources.domElement
//       this.resources.pixiApp.renderer.resize(clientWidth, clientHeight)
//     }

//     // Render the PIXI application
//     this.resources.pixiApp.render()
//   }
// }

// class TextExtension extends Extension {
//   public async initialize(resources: Resources): Promise<void> {
//     const group = System.group(TestSystem, { resources })

//     this._updateGroup = group
//   }
// }

describe('renderer', async () => {
  it('should add initial blocks to pixi stage', async () => {
    const renderer = new Renderer()
    const block = createTestBlock()
    const canvas = await InfiniteCanvas.New({ autoloop: false }, [block], [renderer])

    await canvas.execute()

    const pixiBlock = renderer._pixiApp?.stage.getChildByLabel(block.id)

    expect(pixiBlock).toBeTruthy()
  })

  // it('should update block properties on the pixi stage', async () => {
  //   const renderer = new Renderer()
  //   const block = createTestBlock()
  //   const canvas = await InfiniteCanvas.New({ autoloop: false }, [block], [renderer])
  //   await canvas.execute()

  //   // Update block properties
  //   block.left = 150
  //   block.top = 150
  //   block.red = 0
  //   block.green = 255
  //   await canvas.update([block])
  //   await canvas.execute()

  //   const pixiBlock = renderer._pixiApp?.stage.getChildByLabel(block.id)
  //   expect(pixiBlock).toBeTruthy()
  //   // Optionally, check position/color if accessible
  // })

  // it('should remove blocks from the pixi stage', async () => {
  //   const renderer = new Renderer()
  //   const block = createTestBlock()
  //   const canvas = await InfiniteCanvas.New({ autoloop: false }, [block], [renderer])
  //   await canvas.execute()

  //   await canvas.update([]) // Remove all blocks
  //   await canvas.execute()

  //   const pixiBlock = renderer._pixiApp?.stage.getChildByLabel(block.id)
  //   expect(pixiBlock).toBeFalsy()
  // })

  // it('should handle multiple blocks', async () => {
  //   const renderer = new Renderer()
  //   const blocks = [createTestBlock(), createTestBlock(), createTestBlock()]
  //   const canvas = await InfiniteCanvas.New({ autoloop: false }, blocks, [renderer])
  //   await canvas.execute()

  //   for (const block of blocks) {
  //     const pixiBlock = renderer._pixiApp?.stage.getChildByLabel(block.id)
  //     expect(pixiBlock).toBeTruthy()
  //   }
  // })

  // it('should resize the pixi renderer when the canvas is resized', async () => {
  //   const renderer = new Renderer()
  //   const block = createTestBlock()
  //   const canvas = await InfiniteCanvas.New({ autoloop: false }, [block], [renderer])
  //   await canvas.execute()

  //   // Simulate resize
  //   const app = renderer._pixiApp
  //   if (app) {
  //     const oldWidth = app.renderer.width
  //     const oldHeight = app.renderer.height
  //     // Simulate domElement resize
  //     app.renderer.view.clientWidth = oldWidth + 100
  //     app.renderer.view.clientHeight = oldHeight + 100
  //     // Trigger resize logic (may need to trigger a method or event depending on your implementation)
  //     await canvas.execute()
  //     expect(app.renderer.width).not.toBe(oldWidth)
  //     expect(app.renderer.height).not.toBe(oldHeight)
  //   }
  // })
})
