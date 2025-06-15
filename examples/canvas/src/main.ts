import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { BlockExtension } from '@infinitecanvas/extension-block'
import { InputExtension } from '@infinitecanvas/extension-input'
import { RendererExtension } from '@infinitecanvas/extension-renderer'
import { v4 as uuid } from 'uuid'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container" class="absolute inset-0"></div>
`

let infiniteCanvas: InfiniteCanvas | null = null
async function initializeCanvas(container: HTMLDivElement) {
  infiniteCanvas = await InfiniteCanvas.New([new InputExtension(), new BlockExtension(), new RendererExtension()])
  container.appendChild(infiniteCanvas.domElement)
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas(document.querySelector<HTMLDivElement>('#container')!)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'y') {
    infiniteCanvas?.commands.block.addBlock({
      id: uuid(),
      top: 300 + Math.random() * 400,
      left: 300 + Math.random() * 400,
      width: 150,
      height: 150,
      alpha: 255,
    })
    // infiniteCanvas?.commands.block.addBlock('blue')
    // infiniteCanvas.sendCommand('createBlock', 'hello?')
  }

  if (event.key === 'Delete') {
    infiniteCanvas?.commands.block.removeSelected()
  }

  if (event.key === 'z') {
    infiniteCanvas?.store.undo()
  }

  // if (event.key === 'x') {
  //   infiniteCanvas?.store.block.getBlocks().forEach((block) => {
  //     // infiniteCanvas?.commands.block.removeBlock(block.id)
  //     console.log(block)
  //   })
  // }
})
