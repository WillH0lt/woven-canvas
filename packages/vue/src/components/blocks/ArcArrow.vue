<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { Color } from "@infinitecanvas/editor";
import { Arc, type ArcComputed, type Vec2 } from "@infinitecanvas/math";
import { ArcArrow } from "@infinitecanvas/plugin-arrows";

import { useComponent } from "../../composables/useComponent";
import ArrowHead from "./ArrowHead.vue";
import type { BlockData } from "../../types";
import { getArrowHead } from "../../arrowHeads";

const props = defineProps<BlockData>();

const containerRef = ref<HTMLElement | null>(null);
const clientWidth = ref(0);
const clientHeight = ref(0);

const color = useComponent(props.entityId, Color);
const arcArrow = useComponent(props.entityId, ArcArrow);

// Watch for resize
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (containerRef.value) {
        clientWidth.value = containerRef.value.clientWidth;
        clientHeight.value = containerRef.value.clientHeight;
      }
    });
    resizeObserver.observe(containerRef.value);
    clientWidth.value = containerRef.value.clientWidth;
    clientHeight.value = containerRef.value.clientHeight;
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

const hex = computed(() => {
  if (!color.value) return "#000000";
  const r = color.value.red.toString(16).padStart(2, "0");
  const g = color.value.green.toString(16).padStart(2, "0");
  const b = color.value.blue.toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
});

const baseThickness = computed(() => arcArrow.value?.value[6] ?? 2);
const thickness = computed(() => `${baseThickness.value}px`);

const isEmphasized = computed(() => props.hovered || props.selected);

// Check if the arc is curved (points are not collinear)
const isCurved = computed(() => {
  if (!arcArrow.value) return false;
  const v = arcArrow.value.value;
  // Create arc tuple from UV coords
  const arc = Arc.create(v[0], v[1], v[2], v[3], v[4], v[5], v[6]);
  return !Arc.isCollinear(arc);
});

// Compute world-space arc from UV coordinates
const worldArc = computed(() => {
  if (!arcArrow.value) return null;
  const v = arcArrow.value.value;
  const w = clientWidth.value;
  const h = clientHeight.value;
  return Arc.create(
    v[0] * w,
    v[1] * h,
    v[2] * w,
    v[3] * h,
    v[4] * w,
    v[5] * h,
    v[6]
  );
});

// Compute arc properties (center, radius, etc.)
const arcComputed = computed((): ArcComputed | null => {
  if (!worldArc.value || !isCurved.value) return null;
  return Arc.compute(worldArc.value);
});

// Compute trimmed path data
const pathData = computed(() => {
  if (!arcArrow.value || !worldArc.value) return null;

  const arc = worldArc.value;
  const startHead = arcArrow.value.startArrowHead;
  const endHead = arcArrow.value.endArrowHead;

  const arcLength = Arc.length(arc);

  let tStart = arcArrow.value.trimStart;
  // Add gap if connected to a block and has arrow head
  if (props.connector?.startBlock && startHead !== "none") {
    const headGap = getArrowHead(startHead)?.gap ?? 0;
    const gap = arcLength > 0 ? headGap / arcLength : 0;
    tStart += gap;
  }

  let tEnd = arcArrow.value.trimEnd;
  // Add gap if connected to a block and has arrow head
  if (props.connector?.endBlock && endHead !== "none") {
    const headGap = getArrowHead(endHead)?.gap ?? 0;
    const gap = arcLength > 0 ? headGap / arcLength : 0;
    tEnd += gap; // Add because we use (1 - tEnd) below
  }

  // tEnd is measured from end toward start, so invert it for arc parametric
  const actualTEnd = 1 - tEnd;

  const start = Arc.parametricToPoint(arc, tStart);
  const end = Arc.parametricToPoint(arc, actualTEnd);
  const startDir = flipDirection(Arc.directionAt(arc, tStart));
  const endDir = Arc.directionAt(arc, actualTEnd);

  return {
    start,
    end,
    startDir,
    endDir,
    tStart,
    tEnd: actualTEnd,
    startHead,
    endHead,
  };
});

// SVG path for curved arc
const curvedPath = computed(() => {
  if (!pathData.value || !arcComputed.value || !isCurved.value) return "";

  const { start, end, tStart, tEnd } = pathData.value;
  const { radius, clockwise, arcAngle } = arcComputed.value;

  const trimmedArcAngle = arcAngle * (tEnd - tStart);
  const largeArc = trimmedArcAngle > Math.PI ? 1 : 0;
  const sweep = clockwise ? 0 : 1;

  return `M ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end[0]} ${end[1]}`;
});

// SVG line for straight arrow
const straightLinePoints = computed(() => {
  if (!pathData.value || isCurved.value) return null;
  return {
    x1: pathData.value.start[0],
    y1: pathData.value.start[1],
    x2: pathData.value.end[0],
    y2: pathData.value.end[1],
  };
});

function flipDirection(dir: Vec2): Vec2 {
  return [-dir[0], -dir[1]];
}
</script>

<template>
  <div ref="containerRef" class="ic-arc-arrow">
    <svg class="arrow-svg" preserveAspectRatio="none">
      <!-- Curved arc path -->
      <template v-if="isCurved && curvedPath">
        <path
          :d="curvedPath"
          :stroke="hex"
          fill="none"
          :stroke-width="thickness"
          stroke-linecap="round"
        />
      </template>

      <!-- Straight line path -->
      <template v-else-if="straightLinePoints">
        <line
          :x1="straightLinePoints.x1"
          :y1="straightLinePoints.y1"
          :x2="straightLinePoints.x2"
          :y2="straightLinePoints.y2"
          :stroke="hex"
          fill="none"
          :stroke-width="thickness"
          stroke-linecap="round"
        />
      </template>

      <!-- Arrow heads -->
      <template v-if="pathData">
        <ArrowHead
          v-if="pathData.startHead !== 'none'"
          :position="pathData.start"
          :direction="pathData.startDir"
          :thickness="thickness"
          :arrow-thickness="baseThickness"
          :color="hex"
          :kind="pathData.startHead"
        />
        <ArrowHead
          v-if="pathData.endHead !== 'none'"
          :position="pathData.end"
          :direction="pathData.endDir"
          :thickness="thickness"
          :arrow-thickness="baseThickness"
          :color="hex"
          :kind="pathData.endHead"
        />

        <!-- Highlight overlay -->
        <template v-if="isEmphasized">
          <path
            v-if="isCurved && curvedPath"
            :d="curvedPath"
            class="highlight-overlay"
            fill="none"
            style="stroke-width: calc(2px / var(--ic-zoom))"
            stroke-linecap="round"
          />
          <line
            v-else-if="straightLinePoints"
            :x1="straightLinePoints.x1"
            :y1="straightLinePoints.y1"
            :x2="straightLinePoints.x2"
            :y2="straightLinePoints.y2"
            class="highlight-overlay"
            fill="none"
            style="stroke-width: calc(2px / var(--ic-zoom))"
            stroke-linecap="round"
          />
          <ArrowHead
            v-if="pathData.startHead !== 'none'"
            :position="pathData.start"
            :direction="pathData.startDir"
            thickness="calc(2px / var(--ic-zoom))"
            :arrow-thickness="baseThickness"
            color="var(--ic-highlighted-block-outline-color)"
            :kind="pathData.startHead"
          />
          <ArrowHead
            v-if="pathData.endHead !== 'none'"
            :position="pathData.end"
            :direction="pathData.endDir"
            thickness="calc(2px / var(--ic-zoom))"
            :arrow-thickness="baseThickness"
            color="var(--ic-highlighted-block-outline-color)"
            :kind="pathData.endHead"
          />
        </template>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.ic-arc-arrow {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: visible;
  box-sizing: border-box;
}

.arrow-svg {
  width: 100%;
  height: 100%;
  overflow: visible !important;
}

.highlight-overlay {
  stroke: var(--ic-highlighted-block-outline-color);
}
</style>

<style>
.ic-block[data-hovered] > .ic-arc-arrow,
.ic-block[data-selected] > .ic-arc-arrow {
  outline: none;
}
</style>
