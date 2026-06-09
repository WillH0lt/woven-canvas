<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Color, Block } from '@woven-canvas/core'
import { useComponent } from '../../composables/useComponent'
import { PenStroke, PenStrokeKind } from '@woven-canvas/plugin-pen'
import { getStroke } from 'perfect-freehand'
import type { BlockData } from '../../types'

const props = defineProps<BlockData>()

// Debug: render a red dot at every stored stroke point. Flip to false to hide.
const SHOW_DEBUG_POINTS = false

const penStroke = useComponent(props.entityId, PenStroke)
const block = useComponent(props.entityId, Block)
const color = useComponent(props.entityId, Color)

const path = shallowRef('')
const highlightPath = shallowRef('')
// Block-local [x, y] coordinates of each stored point, for the debug overlay.
const debugPoints = shallowRef<number[][]>([])

function average(a: number, b: number) {
  return (a + b) / 2
}

function getSvgPathFromStroke(outlinePoints: number[][], pointCount: number, thickness: number): string {
  if (pointCount <= 1 || outlinePoints.length < 3) {
    // Draw a dot when there's only a single point (or a degenerate outline).
    const r = thickness / 2
    return `M ${r},0 a ${r},${r} 0 1 0 0.0001 0`
  }

  let a = outlinePoints[0]
  let b = outlinePoints[1]
  const c = outlinePoints[2]

  let pathStr = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`

  for (let i = 2; i < outlinePoints.length - 1; i++) {
    a = outlinePoints[i]
    b = outlinePoints[i + 1]
    pathStr += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }

  pathStr += `${b[0].toFixed(2)},${b[1].toFixed(2)} `
  pathStr += 'Z'

  return pathStr
}

/**
 * Build a closed, smoothed path that traces the centerline the user drew
 * (rather than perfect-freehand's variable-width outline). The path is closed
 * with `Z`, which connects the final point back to the first with a straight
 * line — so a half-circle becomes a filled semi-circle. Combined with
 * `fill-rule="evenodd"` on the path, self-overlapping shapes (e.g. spirals)
 * leave even-overlap regions empty, matching Concepts' fill tool.
 */
function getFillPathFromPoints(points: number[][]): string {
  if (points.length < 3) return ''

  let pathStr = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `

  // Smooth through midpoints with quadratic segments using each raw point as
  // the control point — same technique as the ribbon path, applied to the
  // centerline.
  for (let i = 1; i < points.length - 1; i++) {
    const mx = average(points[i][0], points[i + 1][0])
    const my = average(points[i][1], points[i + 1][1])
    pathStr += `Q${points[i][0].toFixed(2)},${points[i][1].toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)} `
  }

  const last = points[points.length - 1]
  pathStr += `L${last[0].toFixed(2)},${last[1].toFixed(2)} `
  pathStr += 'Z'

  return pathStr
}

// Watch for changes and regenerate path
watch(
  [penStroke, block],
  ([stroke, blockData]) => {
    if (!stroke || !blockData) {
      path.value = ''
      highlightPath.value = ''
      debugPoints.value = []
      return
    }

    // Skip if no original dimensions yet
    if (!stroke.originalWidth || !stroke.originalHeight) {
      path.value = ''
      highlightPath.value = ''
      debugPoints.value = []
      return
    }

    // Calculate scale from original bounds to current block size
    const scaleX = blockData.size[0] / stroke.originalWidth
    const scaleY = blockData.size[1] / stroke.originalHeight

    // Build input points, transformed to block-local coordinates with scaling
    const inputPoints: number[][] = []
    for (let i = 0; i < stroke.pointCount; i++) {
      const worldX = stroke.points[i * 2]
      const worldY = stroke.points[i * 2 + 1]

      // Transform from world to block-local, then scale
      const localX = (worldX - stroke.originalLeft) * scaleX
      const localY = (worldY - stroke.originalTop) * scaleY

      if (stroke.hasPressure) {
        inputPoints.push([localX, localY, stroke.pressures[i]])
      } else {
        inputPoints.push([localX, localY])
      }
    }

    // Debug overlay: one dot per stored point (block-local coordinates).
    debugPoints.value = SHOW_DEBUG_POINTS ? inputPoints.map((p) => [p[0], p[1]]) : []

    if (stroke.kind === PenStrokeKind.Fill) {
      // Fill mode: trace the drawn centerline and close it into a filled shape.
      const fillPath = getFillPathFromPoints(inputPoints)
      path.value = fillPath
      // Highlight the outline of the filled region when selected/hovered.
      if (stroke.isComplete) {
        highlightPath.value = fillPath
      }
      return
    }

    // Generate stroke outline using perfect-freehand
    const outlinePoints = getStroke(inputPoints, {
      last: stroke.isComplete,
      size: stroke.thickness,
      simulatePressure: !stroke.hasPressure,
    })

    path.value = getSvgPathFromStroke(outlinePoints, stroke.pointCount, stroke.thickness)

    // Generate highlight path for selection/hover
    if (stroke.isComplete) {
      const highlightThickness = inputPoints.length === 1 ? stroke.thickness : 1
      const highlightOutline = getStroke(inputPoints, {
        last: true,
        size: highlightThickness,
        simulatePressure: !stroke.hasPressure,
      })
      highlightPath.value = getSvgPathFromStroke(highlightOutline, stroke.pointCount, highlightThickness)
    }
  },
  { immediate: true },
)

// SVG fill rule — even-odd for fill strokes so self-overlapping shapes leave
// even-overlap regions empty (Concepts-style); non-zero for ink ribbons.
const fillRule = computed(() => (penStroke.value?.kind === PenStrokeKind.Fill ? 'evenodd' : 'nonzero'))

const fillColor = computed(() => {
  if (!color.value) return '#000000'
  return `rgb(${color.value.red}, ${color.value.green}, ${color.value.blue})`
})

const isEmphasized = computed(() => props.selected || props.hovered)
</script>

<template>
  <div
    class="wov-pen-stroke"
    :data-complete="penStroke?.isComplete || undefined"
  >
    <svg preserveAspectRatio="none">
      <path :d="path" :fill="fillColor" :fill-rule="fillRule" />
    </svg>
    <svg v-if="isEmphasized" class="highlight" preserveAspectRatio="none">
      <path
        :d="highlightPath"
        stroke="var(--wov-highlighted-block-outline-color)"
        style="stroke-width: calc(1px / var(--wov-zoom))"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-if="SHOW_DEBUG_POINTS && debugPoints.length" class="debug" preserveAspectRatio="none">
      <circle v-for="(p, i) in debugPoints" :key="i" :cx="p[0]" :cy="p[1]" />
    </svg>
  </div>
</template>

<style scoped>
.wov-pen-stroke {
  position: relative;
  width: 100%;
  height: 100%;
}

.wov-pen-stroke * {
  box-sizing: border-box;
  overflow: visible;
  display: block;
}

.wov-pen-stroke svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.wov-pen-stroke .highlight {
  position: absolute;
  inset: 0;
}

/* Debug overlay: red dots marking each stored stroke point. */
.wov-pen-stroke .debug {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.wov-pen-stroke .debug circle {
  r: calc(3px / var(--wov-zoom));
  fill: red;
}
</style>

<style>
.wov-block[data-hovered] > .wov-pen-stroke,
.wov-block[data-selected] > .wov-pen-stroke {
  outline: none;
}

/* Hide held-by-other outline while stroke is being drawn */
.wov-block[data-held-by-other] > .wov-pen-stroke:not([data-complete]) {
  outline: none;
}
</style>
