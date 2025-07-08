import { LoremIpsum } from "lorem-ipsum";

import './style.css'
import { type BlockModel, InfiniteCanvas } from '@infinitecanvas/core'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { InputExtension } from '@infinitecanvas/extension-input'
import { LocalStorageExtension } from '@infinitecanvas/extension-local-storage'
import { MultiplayerExtension } from '@infinitecanvas/extension-multiplayer'
import { RendererExtension } from '@infinitecanvas/extension-renderer'

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4
  },
  wordsPerSentence: {
    max: 16,
    min: 4
  }
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container" class="absolute inset-0"></div>

  <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-4 bg-white rounded shadow flex gap-4 cursor-pointer">
    <button id="blockBtn" class="bg-amber-300 p-2 rounded">
      block
    </button>
    <button id="textBtn" class="bg-amber-300 p-2 rounded">
      text
    </button>
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

document.querySelector<HTMLDivElement>('#blockBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  addBlock(left, top)
})

document.querySelector<HTMLDivElement>('#textBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  addText(left, top)
})

function generateBlock(block: Partial<BlockModel>): Partial<BlockModel> {
  return {
    id: crypto.randomUUID(),
    left: Math.random() * window.innerWidth,
    top: Math.random() * window.innerHeight,
    width: 100,
    height: 100,
    tag: 'block',
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: 255,
    ...block,
  }
}

function addBlock(left: number, top: number): void {
  const block = generateBlock({ left, top })
  infiniteCanvas?.commands.block.addBlock(block)
}

function addText(left: number, top: number): void {
  const block = generateBlock({ left, top })
  infiniteCanvas?.commands.block.addText(block, { content: lorem.generateParagraphs(5), fontSize: 24 })
}
