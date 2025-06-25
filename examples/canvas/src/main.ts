import './style.css'
import { InfiniteCanvas } from '@infinitecanvas/core'
import { ControlsExtension } from '@infinitecanvas/extension-controls'
import { InputExtension } from '@infinitecanvas/extension-input'
import { RendererExtension } from '@infinitecanvas/extension-renderer'
import {} from '@preact/signals-core'
import { v4 as uuid } from 'uuid'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="container" class="absolute inset-0"></div>
  <div class="absolute bottom-0 left-0 p-4">
    x: <span id="x">0</span>, y: <span id="y">0</span>
  </div>
`

let infiniteCanvas: InfiniteCanvas | null = null

async function initializeCanvas(container: HTMLDivElement) {
  infiniteCanvas = await InfiniteCanvas.New([new InputExtension(), new ControlsExtension(), new RendererExtension()])
  container.appendChild(infiniteCanvas.domElement)

  // const count = signal(0)

  // const double = computed(() => count.value * 2)

  // // effect(() => {
  // //   console.log('Count:', count.value, 'Double:', double.value)
  // // })
  // double.subscribe((value) => {
  //   console.log('Double value changed:', value)
  // })

  // infiniteCanvas.store.core.blockCount.subscribe((count) => {
  //   console.log('Block count:', count)
  // })

  // infiniteCanvas.store.core.selectedBlockCount.subscribe((count) => {
  //   console.log('Selected block count:', count)
  // })

  let unsubscribe: (() => void) | undefined = undefined
  infiniteCanvas.store.block.selectedBlockIds.subscribe((ids) => {
    unsubscribe?.()

    unsubscribe = infiniteCanvas?.store.block.blockById(ids[0])?.subscribe((block) => {
      if (block) {
        const xElement = document.querySelector<HTMLSpanElement>('#x')
        const yElement = document.querySelector<HTMLSpanElement>('#y')
        if (xElement && yElement) {
          xElement.textContent = block.left.toFixed(2)
          yElement.textContent = block.top.toFixed(2)
        }
      }
    })
  })

  // effect(() => {
  //   const count = infiniteCanvas?.store.block.blockCount
  //   console.log('Block count (effect):', count?.value)
  //   // if (selectedBlocks) {
  //   //   console.log('Selected blocks:', selectedBlocks)
  //   // }
  // })

  // .subscribe((blocks) => {
  //   console.log('Selected blocks:', blocks)
  // })

  // infiniteCanvas.store.subscribe((state) => {
  //   const block = state.blocks[Object.keys(state.blocks)[0]]
  //   const xElement = document.querySelector<HTMLSpanElement>('#x')
  //   const yElement = document.querySelector<HTMLSpanElement>('#y')
  //   if (xElement && yElement && block) {
  //     xElement.textContent = block.left.toFixed(2)
  //     yElement.textContent = block.top.toFixed(2)
  //   }
  // })

  // infiniteCanvas.store.subscribe((state) => console.log('change'))

  const size = 10_000
  const nBlocks = 5_000
  for (let i = 0; i < nBlocks; i++) {
    const x = 2 * size * (Math.random() - 0.5)
    const y = 2 * size * (Math.random() - 0.5)
    addBlock(x, y)
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
    infiniteCanvas?.commands.controls.removeSelected()
  }

  if (event.key === 'z') {
    // infiniteCanvas?.store.selectedBlocks

    const store = infiniteCanvas?.store
    if (!store) return
    // const block = store.blocks.get(Object.keys(store.blocks)[0])

    // console.log(store.state)

    // const blockId = store.state.blocks.keys().next().value
    // if (!blockId) return

    // const xElement = document.querySelector<HTMLSpanElement>('#x')
    // const yElement = document.querySelector<HTMLSpanElement>('#y')

    // const block = store.blocks.get(blockId)
    // block?.subscribe((value) => {
    //   xElement.textContent = value.left.toFixed(2)
    //   yElement.textContent = value.top.toFixed(2)
    // })

    // Log current state
    // console.log('Current state:', infiniteCanvas?.store.getState())
  }

  // if (event.key === 'u') {
  //   infiniteCanvas?.commands.block.setTool(Tool.AddBlock, { width: 150, height: 150, blue: 255 })
  // }

  if (event.key === ' ') {
    infiniteCanvas?.commands.block.moveCamera(i * 100, i * 100)
    i++
  }

  // if (event.key === 'z') {
  //   infiniteCanvas?.commands.block.setZoom(5)
  // }

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
