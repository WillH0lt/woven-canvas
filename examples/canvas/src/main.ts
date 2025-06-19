import './style.css'
import { InfiniteCanvas, Tool } from '@infinitecanvas/core'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { InputExtension } from '@infinitecanvas/extension-input'
import { RendererExtension } from '@infinitecanvas/extension-renderer'
import { v4 as uuid } from 'uuid'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container" class="absolute inset-0"></div>
`

let infiniteCanvas: InfiniteCanvas | null = null
async function initializeCanvas(container: HTMLDivElement) {
  infiniteCanvas = await InfiniteCanvas.New([new InputExtension(), new ControlsExtension(), new RendererExtension()])
  container.appendChild(infiniteCanvas.domElement)

  for (let i = 0; i < 100; i++) {
    addBlock(i * 100, i * 100)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas(document.querySelector<HTMLDivElement>('#container')!)
})

let i = 1

document.addEventListener('keydown', (event) => {
  // if (event.key === 'y') {
  //   addBlock()
  // }

  if (event.key === 'Delete') {
    infiniteCanvas?.commands.block.removeSelected()
  }

  if (event.key === 'z') {
    infiniteCanvas?.store.undo()
  }

  if (event.key === 'u') {
    infiniteCanvas?.commands.block.setTool(Tool.AddBlock, { width: 150, height: 150, blue: 255 })
  }

  if (event.key === ' ') {
    infiniteCanvas?.commands.controls.moveCamera(i * 100, i * 100)
    i++
  }

  if (event.key === 'z') {
    infiniteCanvas?.commands.controls.setZoom(5)
  }

  // if (event.key === 'x') {
  //   infiniteCanvas?.store.block.getBlocks().forEach((block) => {
  //     // infiniteCanvas?.commands.block.removeBlock(block.id)
  //     console.log(block)
  //   })
  // }
})

function addBlock(left: number, top: number): void {
  const width = 100
  const height = 100
  infiniteCanvas?.commands.block.addBlock({
    id: uuid(),
    top,
    left,
    width,
    height,
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: 255,
  })
}
