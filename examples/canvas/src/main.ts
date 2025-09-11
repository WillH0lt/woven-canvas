import { LoremIpsum } from 'lorem-ipsum'

import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { ArrowsExtension } from '@infinitecanvas/extension-arrows'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { EraserExtension } from '@infinitecanvas/extension-eraser'
import { InkExtension } from '@infinitecanvas/extension-ink'
import { RoughShapesExtension } from '@infinitecanvas/extension-rough-shapes'
// import { Multiplayer } from '@infinitecanvas/extension-multiplayer'
import { StickyNotesExtension } from '@infinitecanvas/extension-sticky-notes'
import { TextExtension } from '@infinitecanvas/extension-text'

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
`
// <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-4 bg-white rounded shadow flex gap-4 cursor-pointer">
//   <button id="textBtn" class="bg-amber-300 p-2 rounded">
//     text
//   </button>
//   <button id="stickyNoteBtn" class="bg-amber-300 p-2 rounded">
//     sticky note
//   </button>
//   <button id="shapeBtn" class="bg-amber-300 p-2 rounded">
//     shape
//   </button>
//   <button id="sketchBtn" class="bg-amber-300 p-2 rounded">
//     sketch
//   </button>
// </div>

let infiniteCanvas: InfiniteCanvas | null = null

async function initializeCanvas(container: HTMLDivElement) {
  await loadFont('Figtree')

  infiniteCanvas = await InfiniteCanvas.New({
    extensions: [
      // TransformExtension,
      ControlsExtension,
      TextExtension,
      ArrowsExtension,
      StickyNotesExtension,
      RoughShapesExtension,
      // MultiplayerExtension,
      InkExtension,
      EraserExtension,
    ],
  })

  container.appendChild(infiniteCanvas.domElement)

  infiniteCanvas.store.core.blockCount.subscribe((count) => {
    console.log('Block count:', count)
  })

  infiniteCanvas.store.core.controls.subscribe((controls) => {
    console.log('Current controls:', controls)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCanvas(document.querySelector<HTMLDivElement>('#container')!)
})

// document.querySelector<HTMLDivElement>('#textBtn')!.addEventListener('click', () => {
//   const left = Math.random() * window.innerWidth
//   const top = Math.random() * window.innerHeight
//   const block = generateBlock({ tag: 'ic-text', left, top })

//   const text = new Text()
//   text.content = lorem.generateSentences(1)
//   infiniteCanvas?.commands.core.addBlock(block, [text])
// })

// document.querySelector<HTMLDivElement>('#stickyNoteBtn')!.addEventListener('click', () => {
//   const left = Math.random() * window.innerWidth
//   const top = Math.random() * window.innerHeight
//   const block = generateBlock({ tag: 'ic-sticky-note', left, top, width: 300, height: 300 })

//   const color = new Color()
//   color.red = Math.floor(Math.random() * 256)
//   color.green = Math.floor(Math.random() * 256)
//   color.blue = Math.floor(Math.random() * 256)

//   const text = new Text()
//   text.fontSize = 40
//   text.content = lorem.generateSentences(1)
//   text.verticalAlign = VerticalAlign.Center

//   infiniteCanvas?.commands.core.addBlock(block, [color, text])
// })

// document.querySelector<HTMLDivElement>('#shapeBtn')!.addEventListener('click', () => {
//   const left = Math.random() * window.innerWidth
//   const top = Math.random() * window.innerHeight
//   const block = generateBlock({ tag: 'ic-rough-shape', left, top, width: 300, height: 300 })

//   const text = new Text()
//   text.fontSize = 40
//   text.content = lorem.generateSentences(1)
//   text.verticalAlign = VerticalAlign.Center

//   const roughShape = new RoughShape()
//   roughShape.fillRed = 255
//   roughShape.kind = RoughShapeKind.Cloud

//   infiniteCanvas?.commands.core.addBlock(block, [text, roughShape])
// })

// document.querySelector<HTMLDivElement>('#sketchBtn')!.addEventListener('click', () => {
//   infiniteCanvas?.commands.core.setTool('perfect-freehand')
// })

// function generateBlock(block: Partial<Block>): Block {
//   return new Block({
//     left: Math.random() * window.innerWidth,
//     top: Math.random() * window.innerHeight,
//     width: 100,
//     height: 100,
//     id: crypto.randomUUID(),
//     ...block,
//   })
// }

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
