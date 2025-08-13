import { LoremIpsum } from 'lorem-ipsum'

import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { Block } from '@infinitecanvas/core/components'
import { Color, ColorExtension } from '@infinitecanvas/extension-color'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { InputExtension } from '@infinitecanvas/extension-input'
import { PerfectFreehandExtension } from '@infinitecanvas/extension-perfect-freehand'
import { RoughShape, RoughShapeKind, RoughShapesExtension } from '@infinitecanvas/extension-rough-shapes'
// import { Multiplayer } from '@infinitecanvas/extension-multiplayer'
import { StickyNotesExtension } from '@infinitecanvas/extension-sticky-notes'
import { Text, TextExtension, VerticalAlign } from '@infinitecanvas/extension-text'
import { TransformExtension } from '@infinitecanvas/extension-transform'

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
    <button id="textBtn" class="bg-amber-300 p-2 rounded">
      text
    </button>
    <button id="stickyNoteBtn" class="bg-amber-300 p-2 rounded">
      sticky note
    </button>
    <button id="shapeBtn" class="bg-amber-300 p-2 rounded">
      shape
    </button>
    <button id="sketchBtn" class="bg-amber-300 p-2 rounded">
      sketch
    </button>
  </div>
`

let infiniteCanvas: InfiniteCanvas | null = null

async function initializeCanvas(container: HTMLDivElement) {
  await loadFont('Figtree')

  infiniteCanvas = await InfiniteCanvas.New({
    extensions: [
      InputExtension,
      ControlsExtension,
      TransformExtension,
      TextExtension,
      ColorExtension,
      StickyNotesExtension,
      RoughShapesExtension,
      // MultiplayerExtension,
      PerfectFreehandExtension,
    ],
  })

  container.appendChild(infiniteCanvas.domElement)

  infiniteCanvas.store.core.blockCount.subscribe((count) => {
    console.log('Block count:', count)
  })

  // infiniteCanvas.store.textEditor.bold.subscribe((isBold) => {
  //   console.log('Text editor bold:', isBold)
  // })

  // infiniteCanvas.store.textEditor.italic.subscribe((isItalic) => {
  //   console.log('Text editor italic:', isItalic)
  // })

  // infiniteCanvas.store.textEditor.underline.subscribe((isUnderline) => {
  //   console.log('Text editor underline:', isUnderline)
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
    console.log('Creating checkpoint...')
    infiniteCanvas?.commands.core.createCheckpoint()
  }
})

document.querySelector<HTMLDivElement>('#textBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  const block = generateBlock({ tag: 'ic-text', left, top })

  const text = new Text()
  text.content = lorem.generateSentences(1)
  infiniteCanvas?.commands.core.addBlock(block, [text])
})

document.querySelector<HTMLDivElement>('#stickyNoteBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  const block = generateBlock({ tag: 'ic-sticky-note', left, top, width: 300, height: 300 })

  const color = new Color()
  color.red = Math.floor(Math.random() * 256)
  color.green = Math.floor(Math.random() * 256)
  color.blue = Math.floor(Math.random() * 256)

  const text = new Text()
  text.fontSize = 40
  text.content = lorem.generateSentences(1)
  text.verticalAlign = VerticalAlign.Center

  infiniteCanvas?.commands.core.addBlock(block, [color, text])
})

document.querySelector<HTMLDivElement>('#shapeBtn')!.addEventListener('click', () => {
  const left = Math.random() * window.innerWidth
  const top = Math.random() * window.innerHeight
  const block = generateBlock({ tag: 'ic-rough-shape', left, top, width: 300, height: 300 })

  const text = new Text()
  text.fontSize = 40
  text.content = lorem.generateSentences(1)
  text.verticalAlign = VerticalAlign.Center

  const roughShape = new RoughShape()
  roughShape.fillRed = 255
  roughShape.kind = RoughShapeKind.Cloud

  infiniteCanvas?.commands.core.addBlock(block, [text, roughShape])
})

document.querySelector<HTMLDivElement>('#sketchBtn')!.addEventListener('click', () => {
  infiniteCanvas?.commands.core.setTool('perfect-freehand')
})

function generateBlock(block: Partial<Block>): Block {
  return new Block({
    left: Math.random() * window.innerWidth,
    top: Math.random() * window.innerHeight,
    width: 100,
    height: 100,
    id: crypto.randomUUID(),
    ...block,
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
