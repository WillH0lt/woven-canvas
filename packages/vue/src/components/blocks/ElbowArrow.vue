<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { Color } from "@woven-canvas/core";
import { Vec2 } from "@woven-canvas/math";
import { ElbowArrow } from "@woven-canvas/plugin-arrows";
import { useComponent } from "../../composables/useComponent";
import ArrowHead from "./ArrowHead.vue";
import type { BlockData } from "../../types";
import { getArrowHead } from "../../arrowHeads";

const props = defineProps<BlockData>();

const containerRef = ref<HTMLElement | null>(null);
const clientWidth = ref(0);
const clientHeight = ref(0);

const color = useComponent(props.entityId, Color);
const elbowArrow = useComponent(props.entityId, ElbowArrow);

const isEmphasized = computed(() => props.hovered || props.selected);

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

const baseThickness = computed(() => elbowArrow.value?.thickness ?? 2);
const thickness = computed(() => `${baseThickness.value}px`);

// Get points from the elbow arrow buffer
const worldPoints = computed((): Vec2[] => {
  if (!elbowArrow.value) return [];

  const arrow = elbowArrow.value;
  const w = clientWidth.value;
  const h = clientHeight.value;
  const points: Vec2[] = [];

  for (let i = 0; i < arrow.pointCount; i++) {
    const x = arrow.points[i * 2] * w;
    const y = arrow.points[i * 2 + 1] * h;
    points.push([x, y]);
  }

  return points;
});

// Untrimmed line segments for highlight background
const untrimmedLines = computed((): { start: Vec2; end: Vec2 }[] => {
  const points = worldPoints.value;
  if (points.length < 2) return [];

  const lines: { start: Vec2; end: Vec2 }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    lines.push({ start: points[i], end: points[i + 1] });
  }
  return lines;
});

// Compute trimmed path data
const pathData = computed(() => {
  if (!elbowArrow.value || worldPoints.value.length < 2) return null;

  const arrow = elbowArrow.value;
  const points = [...worldPoints.value.map((p) => [...p] as Vec2)];

  const startHead = arrow.startArrowHead;
  const endHead = arrow.endArrowHead;

  // Compute direction vectors
  const startVec: Vec2 = [
    points[1][0] - points[0][0],
    points[1][1] - points[0][1],
  ];
  const endVec: Vec2 = [
    points[points.length - 1][0] - points[points.length - 2][0],
    points[points.length - 1][1] - points[points.length - 2][1],
  ];

  let tStart = arrow.trimStart;
  // Add gap if connected to a block and has arrow head
  if (props.connector?.startBlock && startHead !== "none") {
    const len = Math.hypot(startVec[0], startVec[1]);
    const headGap = getArrowHead(startHead)?.gap ?? 0;
    const gap = len > 0 ? headGap / len : 0;
    tStart += gap;
  }

  let tEnd = arrow.trimEnd;
  // Add gap if connected to a block and has arrow head
  if (props.connector?.endBlock && endHead !== "none") {
    const len = Math.hypot(endVec[0], endVec[1]);
    const headGap = getArrowHead(endHead)?.gap ?? 0;
    const gap = len > 0 ? headGap / len : 0;
    tEnd += gap;
  }

  // Trim start point
  points[0] = [
    points[0][0] + (points[1][0] - points[0][0]) * tStart,
    points[0][1] + (points[1][1] - points[0][1]) * tStart,
  ];

  // Trim end point
  const lastIdx = points.length - 1;
  points[lastIdx] = [
    points[lastIdx - 1][0] +
      (points[lastIdx][0] - points[lastIdx - 1][0]) * (1 - tEnd),
    points[lastIdx - 1][1] +
      (points[lastIdx][1] - points[lastIdx - 1][1]) * (1 - tEnd),
  ];

  // Build line segments
  const lines: { start: Vec2; end: Vec2 }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    lines.push({ start: points[i], end: points[i + 1] });
  }

  // Flip start direction for arrow head
  Vec2.scale(startVec, -1);

  return {
    points,
    lines,
    startPos: points[0],
    endPos: points[points.length - 1],
    startDir: startVec,
    endDir: endVec,
    startHead,
    endHead,
  };
});
</script>

<template>
  <div ref="containerRef" class="wov-elbow-arrow">
    <svg class="arrow-svg" preserveAspectRatio="none">
      <!-- Highlight background (dashed, untrimmed) -->
      <template v-if="isEmphasized && untrimmedLines.length > 0">
        <line
          v-for="(line, index) in untrimmedLines"
          :key="'bg-' + index"
          :x1="line.start[0]"
          :y1="line.start[1]"
          :x2="line.end[0]"
          :y2="line.end[1]"
          class="highlight-bg"
          fill="none"
          style="
            stroke-width: calc(2px / var(--wov-zoom));
            stroke-dasharray: calc(12px / var(--wov-zoom));
          "
          stroke-linecap="round"
        ></line>
      </template>

      <template v-if="pathData">
        <!-- Main arrow line segments -->
        <line
          v-for="(line, index) in pathData.lines"
          :key="index"
          :x1="line.start[0]"
          :y1="line.start[1]"
          :x2="line.end[0]"
          :y2="line.end[1]"
          :stroke="hex"
          fill="none"
          :stroke-width="thickness"
          stroke-linecap="round"
        ></line>

        <!-- Arrow heads -->
        <ArrowHead
          v-if="pathData.startHead !== 'none'"
          :position="pathData.startPos"
          :direction="pathData.startDir"
          :thickness="thickness"
          :arrow-thickness="baseThickness"
          :color="hex"
          :kind="pathData.startHead"
        />
        <ArrowHead
          v-if="pathData.endHead !== 'none'"
          :position="pathData.endPos"
          :direction="pathData.endDir"
          :thickness="thickness"
          :arrow-thickness="baseThickness"
          :color="hex"
          :kind="pathData.endHead"
        />

        <!-- Highlight overlay (solid, trimmed) -->
        <template v-if="isEmphasized">
          <line
            v-for="(line, index) in pathData.lines"
            :key="'hl-' + index"
            :x1="line.start[0]"
            :y1="line.start[1]"
            :x2="line.end[0]"
            :y2="line.end[1]"
            class="highlight-overlay"
            fill="none"
            style="stroke-width: calc(2px / var(--wov-zoom))"
            stroke-linecap="round"
          ></line>
          <ArrowHead
            v-if="pathData.startHead !== 'none'"
            :position="pathData.startPos"
            :direction="pathData.startDir"
            thickness="calc(2px / var(--wov-zoom))"
            :arrow-thickness="baseThickness"
            color="var(--wov-highlighted-block-outline-color)"
            :kind="pathData.startHead"
          />
          <ArrowHead
            v-if="pathData.endHead !== 'none'"
            :position="pathData.endPos"
            :direction="pathData.endDir"
            thickness="calc(2px / var(--wov-zoom))"
            :arrow-thickness="baseThickness"
            color="var(--wov-highlighted-block-outline-color)"
            :kind="pathData.endHead"
          />
        </template>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.wov-elbow-arrow {
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

.highlight-bg {
  stroke: var(--wov-gray-600);
}

.highlight-overlay {
  stroke: var(--wov-highlighted-block-outline-color);
}
</style>

<style>
.wov-block[data-hovered] > .wov-elbow-arrow,
.wov-block[data-selected] > .wov-elbow-arrow {
  outline: none;
}
</style>
