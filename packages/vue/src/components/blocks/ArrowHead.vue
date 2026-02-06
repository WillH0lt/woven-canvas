<script setup lang="ts">
import { computed } from "vue";
import type { Vec2 } from "@infinitecanvas/math";

const props = defineProps<{
  position: Vec2;
  direction: Vec2;
  thickness: number | string;
  color: string;
  arrowThickness: number;
}>();

const BASE_ARROW_HEAD_LENGTH = 15;
const BASE_ARROW_HEAD_WIDTH = 15;
const BASE_THICKNESS = 2;

const points = computed(() => {
  const dirLen = Math.hypot(props.direction[0], props.direction[1]);
  if (dirLen === 0) return null;

  // Scale arrow head with thickness using cube root for dampened effect
  const thicknessScale = (props.arrowThickness / BASE_THICKNESS) ** 0.33;
  const headLength = BASE_ARROW_HEAD_LENGTH * thicknessScale;
  const headWidth = BASE_ARROW_HEAD_WIDTH * thicknessScale;

  const unitDir: Vec2 = [
    props.direction[0] / dirLen,
    props.direction[1] / dirLen,
  ];
  const perpDir: Vec2 = [-unitDir[1], unitDir[0]];

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
</script>

<template>
  <g v-if="points">
    <line
      :x1="points.p1[0]"
      :y1="points.p1[1]"
      :x2="position[0]"
      :y2="position[1]"
      :stroke="color"
      :stroke-width="thickness"
      stroke-linecap="round"
    />
    <line
      :x1="points.p2[0]"
      :y1="points.p2[1]"
      :x2="position[0]"
      :y2="position[1]"
      :stroke="color"
      :stroke-width="thickness"
      stroke-linecap="round"
    />
  </g>
</template>
