<script setup lang="ts">
import {
  type Editor,
  Block,
  Shape,
  addComponent,
  createEntity,
  RankBounds,
  Synced,
  defineQuery,
  type EntityId,
} from '@woven-canvas/core'
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { ref, onUnmounted } from 'vue'

const editorRef = ref<Editor | null>(null)
const isAnimating = ref(false)
let animationFrame: number | null = null

// Store entity IDs for animation
const shapeEntities = ref<EntityId[]>([])

// Query for synced blocks
const blocksQuery = defineQuery((q) => q.with(Synced, Block))

function handleReady(editor: Editor) {
  editorRef.value = editor

  editor.nextTick((ctx) => {
    // Create shapes in a circle pattern
    const centerX = 200
    const centerY = 180
    const radius = 100
    const count = 6

    const colors = [
      [239, 68, 68], // red
      [234, 179, 8], // yellow
      [34, 197, 94], // green
      [6, 182, 212], // cyan
      [59, 130, 246], // blue
      [168, 85, 247], // purple
    ]

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius - 25
      const y = centerY + Math.sin(angle) * radius - 25

      const entityId = createEntity(ctx)
      addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
      addComponent(ctx, entityId, Shape, {
        kind: 'ellipse',
        strokeWidth: 2,
        fillRed: colors[i][0],
        fillGreen: colors[i][1],
        fillBlue: colors[i][2],
        fillAlpha: 230,
      })
      addComponent(ctx, entityId, Block, {
        tag: 'shape',
        position: [x, y],
        size: [50, 50],
        rank: RankBounds.genNext(ctx),
      })

      shapeEntities.value.push(entityId)
    }
  })
}

let startTime = 0

function animate() {
  const editor = editorRef.value
  if (!editor || !isAnimating.value) return

  const elapsed = (performance.now() - startTime) / 1000

  editor.nextTick((ctx) => {
    const centerX = 200
    const centerY = 180
    const radius = 100
    const count = shapeEntities.value.length

    for (let i = 0; i < count; i++) {
      const entityId = shapeEntities.value[i]

      // Rotate around center
      const angle = (i / count) * Math.PI * 2 + elapsed * 0.5

      // Pulse size
      const scale = 1 + Math.sin(elapsed * 2 + i * 0.5) * 0.2
      const size = 50 * scale

      const x = centerX + Math.cos(angle) * radius - size / 2
      const y = centerY + Math.sin(angle) * radius - size / 2

      const block = Block.write(ctx, entityId)
      block.position[0] = x
      block.position[1] = y
      block.size[0] = size
      block.size[1] = size

      // Also animate rotation
      block.rotateZ = elapsed + i * 0.5

      // Animate color
      const shape = Shape.write(ctx, entityId)
      const hue = ((i / count + elapsed * 0.1) % 1) * 360
      const rgb = hslToRgb(hue, 70, 60)
      shape.fillRed = rgb[0]
      shape.fillGreen = rgb[1]
      shape.fillBlue = rgb[2]
    }
  })

  animationFrame = requestAnimationFrame(animate)
}

function toggleAnimation() {
  isAnimating.value = !isAnimating.value

  if (isAnimating.value) {
    startTime = performance.now()
    animate()
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

function resetPositions() {
  const editor = editorRef.value
  if (!editor) return

  isAnimating.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  editor.nextTick((ctx) => {
    const centerX = 200
    const centerY = 180
    const radius = 100
    const count = shapeEntities.value.length

    const colors = [
      [239, 68, 68],
      [234, 179, 8],
      [34, 197, 94],
      [6, 182, 212],
      [59, 130, 246],
      [168, 85, 247],
    ]

    for (let i = 0; i < count; i++) {
      const entityId = shapeEntities.value[i]
      const angle = (i / count) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius - 25
      const y = centerY + Math.sin(angle) * radius - 25

      const block = Block.write(ctx, entityId)
      block.position[0] = x
      block.position[1] = y
      block.size[0] = 50
      block.size[1] = 50
      block.rotateZ = 0

      const shape = Shape.write(ctx, entityId)
      shape.fillRed = colors[i][0]
      shape.fillGreen = colors[i][1]
      shape.fillBlue = colors[i][2]
    }
  })
}

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<template>
  <WovenCanvas @ready="handleReady">
    <template #floating-menu>
      <div class="controls">
        <button @click="toggleAnimation">
          {{ isAnimating ? 'Stop' : 'Animate' }}
        </button>
        <button @click="resetPositions">Reset</button>
      </div>
    </template>
  </WovenCanvas>
</template>

<style scoped>
.controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.controls button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #374151;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.controls button:hover {
  background: #4b5563;
}
</style>
