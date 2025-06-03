import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { BlockExtension } from '@infinitecanvas/extension-block'
import { InputExtension } from '@infinitecanvas/extension-input'
import { RendererExtension } from '@infinitecanvas/extension-renderer'

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
      id: 'block2',
      top: 300,
      left: 300,
      width: 150,
      height: 150,
      red: 0,
      green: 255,
      blue: 0,
      alpha: 255,
    })
    // infiniteCanvas?.commands.block.addBlock('blue')
    // infiniteCanvas.sendCommand('createBlock', 'hello?')
  }
})
