<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { Block, type EntityId } from "@woven-canvas/core";
import { useComponent } from "../../composables/useComponent";
import { EraserStroke, POINTS_CAPACITY } from "@woven-canvas/plugin-eraser";
import { getStroke } from "perfect-freehand";

const props = defineProps<{
  entityId: EntityId;
}>();

const eraserStroke = useComponent(props.entityId, EraserStroke);
const block = useComponent(props.entityId, Block);
const path = shallowRef("");

function average(a: number, b: number) {
  return (a + b) / 2;
}

function getSvgPathFromStroke(
  pointCount: number,
  firstPointIndex: number,
  points: Float32Array,
  thickness: number,
  left: number,
  top: number
): string {
  if (pointCount <= 4) {
    return "";
  }

  // Build input points from circular buffer, shifted by block position
  const inputPoints: [number, number][] = [];
  const effectiveCount = Math.min(pointCount, POINTS_CAPACITY);

  for (let i = 0; i < effectiveCount; i++) {
    const bufferIndex = ((firstPointIndex + i) % POINTS_CAPACITY) * 2;
    inputPoints.push([
      points[bufferIndex] - left,
      points[bufferIndex + 1] - top,
    ]);
  }

  const outlinePoints = getStroke(inputPoints, {
    size: thickness,
    start: {
      taper: 66,
      cap: true,
    },
  });

  if (outlinePoints.length < 3) {
    return "";
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
  [eraserStroke, block],
  ([stroke, blockData]) => {
    if (!stroke || !blockData) {
      path.value = "";
      return;
    }

    const radius = stroke.radius ?? 8;
    const [left, top] = blockData.position;
    path.value = getSvgPathFromStroke(
      stroke.pointCount,
      stroke.firstPointIndex,
      stroke.points,
      2 * radius,
      left,
      top
    );
  },
  { immediate: true }
);

const fillColor = "#88888833";
</script>

<template>
  <div class="ic-eraser-stroke">
    <svg preserveAspectRatio="none">
      <path :d="path" :fill="fillColor" />
    </svg>
  </div>
</template>

<style>
.ic-eraser-stroke {
  position: relative;
  width: 100%;
  height: 100%;
}

.ic-eraser-stroke * {
  box-sizing: border-box;
  overflow: visible;
  display: block;
}

.ic-eraser-stroke svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
