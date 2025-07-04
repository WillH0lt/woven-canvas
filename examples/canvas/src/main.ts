import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { InputExtension } from '@infinitecanvas/extension-input'
import { LocalStorageExtension } from '@infinitecanvas/extension-local-storage'
import { MultiplayerExtension } from '@infinitecanvas/extension-multiplayer'
import { RendererExtension } from '@infinitecanvas/extension-renderer'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container" class="absolute inset-0"></div>
  <div class="absolute bottom-0 left-0 p-4">
    x: <span id="x">0</span>, y: <span id="y">0</span>
  </div>
`

let infiniteCanvas: InfiniteCanvas | null = null

async function initializeCanvas(container: HTMLDivElement) {
  infiniteCanvas = await InfiniteCanvas.New([
    new InputExtension(),
    new ControlsExtension(),
    new RendererExtension(),
    new MultiplayerExtension(),
    new LocalStorageExtension(),
  ])
  container.appendChild(infiniteCanvas.domElement)

  infiniteCanvas.store.block.blockCount.subscribe((count) => {
    console.log('Block count:', count)
  })

  // infiniteCanvas.store.core.selectedBlockCount.subscribe((count) => {
  //   console.log('Selected block count:', count)
  // })

  // let unsubscribe: (() => void) | undefined = undefined
  // infiniteCanvas.store.block.selectedBlockIds.subscribe((ids) => {
  //   unsubscribe?.()

  //   unsubscribe = infiniteCanvas?.store.block.blockById(ids[0])?.subscribe((block) => {
  //     if (block) {
  //       const xElement = document.querySelector<HTMLSpanElement>('#x')
  //       const yElement = document.querySelector<HTMLSpanElement>('#y')
  //       if (xElement && yElement) {
  //         xElement.textContent = block.left.toFixed(2)
  //         yElement.textContent = block.top.toFixed(2)
  //       }
  //     }
  //   })
  // })

  // const size = 10_000
  // const nBlocks = 5_000
  // for (let i = 0; i < nBlocks; i++) {
  //   const x = 2 * size * (Math.random() - 0.5)
  //   const y = 2 * size * (Math.random() - 0.5)
  //   addBlock(x, y)
  // }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas(document.querySelector<HTMLDivElement>('#container')!)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Delete') {
    infiniteCanvas?.commands.controls.removeSelected()
  }

  if (event.key === 'z' && event.ctrlKey) {
    infiniteCanvas?.commands.block.undo()
  }

  if (event.key === 'y' && event.ctrlKey) {
    infiniteCanvas?.commands.block.redo()
  }

  if (event.key === 'q') {
    infiniteCanvas?.commands.block.createCheckpoint()
  }

  // if (event.key === 'u') {
  //   infiniteCanvas?.commands.block.setTool(Tool.AddBlock, { width: 150, height: 150, blue: 255 })
  // }
})

function addBlock(left: number, top: number): void {
  const width = 100
  const height = 100
  infiniteCanvas?.commands.block.addBlock({
    id: crypto.randomUUID(),
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
