<script setup lang="ts">
import { computed } from "vue";
import type { Vec2 } from "@infinitecanvas/math";
import { ArrowHeadKind } from "@infinitecanvas/plugin-arrows";

const props = defineProps<{
  position: Vec2;
  direction: Vec2;
  thickness: number | string;
  color: string;
  arrowThickness: number;
  kind: ArrowHeadKind;
}>();

const BASE_SIZE = 15;
const BASE_THICKNESS = 2;

const geometry = computed(() => {
  const dirLen = Math.hypot(props.direction[0], props.direction[1]);
  if (dirLen === 0) return null;

  // Scale arrow head with thickness using cube root for dampened effect
  const thicknessScale = (props.arrowThickness / BASE_THICKNESS) ** 0.33;
  const size = BASE_SIZE * thicknessScale;

  const unitDir: Vec2 = [
    props.direction[0] / dirLen,
    props.direction[1] / dirLen,
  ];
  const perpDir: Vec2 = [-unitDir[1], unitDir[0]];

  return { unitDir, perpDir, size };
});

// V-shaped arrow head points
const vPoints = computed(() => {
  if (!geometry.value) return null;
  const { unitDir, perpDir, size } = geometry.value;
  const headLength = size;
  const headWidth = size;

  const p1: Vec2 = [
    props.position[0] - unitDir[0] * headLength + perpDir[0] * (headWidth / 2),
    props.position[1] - unitDir[1] * headLength + perpDir[1] * (headWidth / 2),
  ];
  const p2: Vec2 = [
    props.position[0] - unitDir[0] * headLength - perpDir[0] * (headWidth / 2),
    props.position[1] - unitDir[1] * headLength - perpDir[1] * (headWidth / 2),
  ];

  return { p1, p2 };
});

// Delta (filled triangle) points
const deltaPoints = computed(() => {
  if (!geometry.value) return null;
  const { unitDir, perpDir, size } = geometry.value;
  const headLength = size;
  const headWidth = size;

  // translate points in unitDir direction so tip is at position
  const offset: Vec2 = [unitDir[0] * (size * 0.4), unitDir[1] * (size * 0.4)];

  const back: Vec2 = [
    props.position[0] - unitDir[0] * headLength + offset[0],
    props.position[1] - unitDir[1] * headLength + offset[1],
  ];
  const p1: Vec2 = [
    back[0] + perpDir[0] * (headWidth / 2),
    back[1] + perpDir[1] * (headWidth / 2),
  ];
  const p2: Vec2 = [
    back[0] - perpDir[0] * (headWidth / 2),
    back[1] - perpDir[1] * (headWidth / 2),
  ];

  const tip = [props.position[0] + offset[0], props.position[1] + offset[1]];

  return `${tip[0]},${tip[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`;
});

// Circle center and radius
const circleGeom = computed(() => {
  if (!geometry.value) return null;
  const { unitDir, size } = geometry.value;
  const radius = size * 0.8;

  const offset = [unitDir[0] * radius, unitDir[1] * radius];

  const center: Vec2 = [
    props.position[0] - unitDir[0] * radius + offset[0],
    props.position[1] - unitDir[1] * radius + offset[1],
  ];

  return { center, radius };
});

// Diamond points
const diamondPoints = computed(() => {
  if (!geometry.value) return null;
  const { unitDir, perpDir, size } = geometry.value;
  const length = 1.6 * size;
  const width = 1.6 * size;

  const offset = [unitDir[0] * (size * 0.8), unitDir[1] * (size * 0.8)];

  const mid: Vec2 = [
    props.position[0] - unitDir[0] * (length / 2) + offset[0],
    props.position[1] - unitDir[1] * (length / 2) + offset[1],
  ];
  const back: Vec2 = [
    props.position[0] - unitDir[0] * length + offset[0],
    props.position[1] - unitDir[1] * length + offset[1],
  ];
  const left: Vec2 = [
    mid[0] + perpDir[0] * (width / 2),
    mid[1] + perpDir[1] * (width / 2),
  ];
  const right: Vec2 = [
    mid[0] - perpDir[0] * (width / 2),
    mid[1] - perpDir[1] * (width / 2),
  ];

  const front = [props.position[0] + offset[0], props.position[1] + offset[1]];

  return `${front[0]},${front[1]} ${left[0]},${left[1]} ${back[0]},${back[1]} ${right[0]},${right[1]}`;
});
</script>

<template>
  <g v-if="geometry">
    <!-- V-shaped arrow head -->
    <template v-if="kind === ArrowHeadKind.V && vPoints">
      <line
        :x1="vPoints.p1[0]"
        :y1="vPoints.p1[1]"
        :x2="position[0]"
        :y2="position[1]"
        :stroke="color"
        :stroke-width="thickness"
        stroke-linecap="round"
      />
      <line
        :x1="vPoints.p2[0]"
        :y1="vPoints.p2[1]"
        :x2="position[0]"
        :y2="position[1]"
        :stroke="color"
        :stroke-width="thickness"
        stroke-linecap="round"
      />
    </template>

    <!-- Delta (filled triangle) -->
    <polygon
      v-else-if="kind === ArrowHeadKind.Delta && deltaPoints"
      :points="deltaPoints"
      :fill="color"
    />

    <!-- Circle -->
    <circle
      v-else-if="kind === ArrowHeadKind.Circle && circleGeom"
      :cx="circleGeom.center[0]"
      :cy="circleGeom.center[1]"
      :r="circleGeom.radius"
      :fill="color"
    />

    <!-- Diamond -->
    <polygon
      v-else-if="kind === ArrowHeadKind.Diamond && diamondPoints"
      :points="diamondPoints"
      :fill="color"
    />
  </g>
</template>
