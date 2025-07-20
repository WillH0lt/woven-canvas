import { LoremIpsum } from 'lorem-ipsum'

import './style.css'
import { FloatingMenusExtension } from '@infiniteCanvas/extension-floating-menus'
import { type BlockModel, InfiniteCanvas } from '@infinitecanvas/core'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
// import { MultiplayerExtension } from '@infinitecanvas/extension-multiplayer'
import { HtmlRendererExtension } from '@infinitecanvas/extension-html-renderer'
import { InputExtension } from '@infinitecanvas/extension-input'
import { LocalStorageExtension } from '@infinitecanvas/extension-local-storage'

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
})

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
  await loadFont('Figtree')

  infiniteCanvas = await InfiniteCanvas.New([
    new InputExtension(),
    new ControlsExtension(),
    new HtmlRendererExtension(),
    // new MultiplayerExtension(),
    new LocalStorageExtension(),
    new FloatingMenusExtension(),
  ])

  container.appendChild(infiniteCanvas.domElement)

  infiniteCanvas.store.core.blockCount.subscribe((count) => {
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
    infiniteCanvas?.commands.core.removeSelected()
  }

  if (event.key === 'z' && event.ctrlKey) {
    infiniteCanvas?.commands.core.undo()
  }

  if (event.key === 'y' && event.ctrlKey) {
    infiniteCanvas?.commands.core.redo()
  }

  if (event.key === 'q') {
    infiniteCanvas?.commands.core.createCheckpoint()
  }
})

document.querySelector<HTMLDivElement>('#blockBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  addShape(left, top)
})

document.querySelector<HTMLDivElement>('#textBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  addText(left, top)
})

function generateBlock(block: Partial<BlockModel>): Partial<BlockModel> {
  return {
    left: Math.random() * window.innerWidth,
    top: Math.random() * window.innerHeight,
    width: 100,
    height: 100,
    ...block,
  }
}

function addShape(left: number, top: number): void {
  const block = generateBlock({ left, top })
  infiniteCanvas?.commands.core.addShape(block, {
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: 255,
  })
}

function addText(left: number, top: number): void {
  const block = generateBlock({ left, top })
  infiniteCanvas?.commands.core.addText(block, {
    content: lorem.generateSentences(1),
    fontFamily: 'Figtree',
    red: Math.floor(Math.random() * 256),
    green: Math.floor(Math.random() * 256),
    blue: Math.floor(Math.random() * 256),
    alpha: 255,
  })
}

function loadFont(fontFamily: string): Promise<void> {
  return new Promise((resolve) => {
    const href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300&display=swap`
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = (): void => {
      resolve()
    }
    document.head.appendChild(link)

    // loadedFonts.push(fontFamily);
  })
}
