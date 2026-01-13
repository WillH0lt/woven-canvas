<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { Block, Color, type EntityId } from "@infinitecanvas/editor";
import { useComponent } from "../../composables/useComponent";
import { PenStroke } from "@infinitecanvas/plugin-pen";
import { getStroke } from "perfect-freehand";
import type { BlockData } from "../../types";

const props = defineProps<BlockData>();

const penStroke = useComponent(props.entityId, PenStroke);
const block = useComponent(props.entityId, Block);
const color = useComponent(props.entityId, Color);

const path = shallowRef("");
const highlightPath = shallowRef("");

function average(a: number, b: number) {
  return (a + b) / 2;
}

function getSvgPathFromStroke(
  outlinePoints: number[][],
  pointCount: number,
  thickness: number
): string {
  if (pointCount <= 4 || outlinePoints.length < 3) {
    // Draw a dot for very short strokes
    const r = thickness / 2;
    return `M ${r},0 a ${r},${r} 0 1 0 0.0001 0`;
  }

  let a = outlinePoints[0];
  let b = outlinePoints[1];
  const c = outlinePoints[2];

  let pathStr = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2; i < outlinePoints.length - 1; i++) {
    a = outlinePoints[i];
    b = outlinePoints[i + 1];
    pathStr += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  pathStr += `${b[0].toFixed(2)},${b[1].toFixed(2)} `;
  pathStr += "Z";

  return pathStr;
}

// Watch for changes and regenerate path
watch(
  [penStroke, block],
  ([stroke, blockData]) => {
    if (!stroke || !blockData) {
      path.value = "";
      highlightPath.value = "";
      return;
    }

    // Skip if no original dimensions yet
    if (!stroke.originalWidth || !stroke.originalHeight) {
      path.value = "";
      highlightPath.value = "";
      return;
    }

    // Calculate scale from original bounds to current block size
    const scaleX = blockData.size[0] / stroke.originalWidth;
    const scaleY = blockData.size[1] / stroke.originalHeight;

    // Build input points, transformed to block-local coordinates with scaling
    const inputPoints: number[][] = [];
    for (let i = 0; i < stroke.pointCount; i++) {
      const worldX = stroke.points[i * 2];
      const worldY = stroke.points[i * 2 + 1];

      // Transform from world to block-local, then scale
      const localX = (worldX - stroke.originalLeft) * scaleX;
      const localY = (worldY - stroke.originalTop) * scaleY;

      if (stroke.hasPressure) {
        inputPoints.push([localX, localY, stroke.pressures[i]]);
      } else {
        inputPoints.push([localX, localY]);
      }
    }

    // Generate stroke outline using perfect-freehand
    const outlinePoints = getStroke(inputPoints, {
      last: stroke.isComplete,
      size: stroke.thickness,
      simulatePressure: !stroke.hasPressure,
    });

    path.value = getSvgPathFromStroke(
      outlinePoints,
      stroke.pointCount,
      stroke.thickness
    );

    // Generate highlight path for selection/hover
    if (stroke.isComplete) {
      const highlightThickness =
        inputPoints.length === 1 ? stroke.thickness : 1;
      const highlightOutline = getStroke(inputPoints, {
        last: true,
        size: highlightThickness,
        simulatePressure: !stroke.hasPressure,
      });
      highlightPath.value = getSvgPathFromStroke(
        highlightOutline,
        stroke.pointCount,
        highlightThickness
      );
    }
  },
  { immediate: true }
);

const fillColor = computed(() => {
  if (!color.value) return "#000000";
  return `rgb(${color.value.red}, ${color.value.green}, ${color.value.blue})`;
});

const isEmphasized = computed(() => props.selected !== null || props.hovered);
</script>

<template>
  <div class="ic-pen-stroke">
    <svg preserveAspectRatio="none">
      <path :d="path" :fill="fillColor" />
    </svg>
    <svg v-if="isEmphasized" class="highlight" preserveAspectRatio="none">
      <path
        :d="highlightPath"
        stroke="var(--ic-highlighted-block-outline-color)"
        stroke-width="1"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.ic-pen-stroke {
  position: relative;
  width: 100%;
  height: 100%;
}

.ic-pen-stroke * {
  box-sizing: border-box;
  overflow: visible;
  display: block;
}

.ic-pen-stroke svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ic-pen-stroke .highlight {
  position: absolute;
  inset: 0;
}
</style>

<style>
.ic-block[data-hovered] > .ic-pen-stroke,
.ic-block[data-selected] > .ic-pen-stroke {
  outline: none;
}
</style>
