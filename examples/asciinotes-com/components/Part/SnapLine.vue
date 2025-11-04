<template>
  <div ref="container" class="w-full h-full">
    <svg ref="line" class="w-full h-full overflow-visible"></svg>
  </div>
</template>

<script setup lang="ts">
import rough from 'roughjs';
import type { RoughSVG } from 'roughjs/bin/svg.js';

const containerRef = useTemplateRef('container');
// const { width, height } = useElementSize(containerRef);
const lineRef = useTemplateRef('line');
let rc: RoughSVG | null = null;

onMounted(() => {
  const resizeObserver = new ResizeObserver(() => {
    if (!lineRef.value) return;

    while (lineRef.value.firstChild) {
      lineRef.value.removeChild(lineRef.value.firstChild);
    }

    const nodes = getLineNodes();
    nodes.forEach((node) => {
      lineRef.value?.appendChild(node);
    });
  });

  resizeObserver.observe(containerRef.value!);
});

function getLineNodes(): SVGGElement[] {
  if (!lineRef.value || !containerRef.value) return [];

  if (!rc) {
    rc = rough.svg(lineRef.value);
  }

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  if (width > height) {
    y = height / 2;
    w = width;
  } else {
    x = width / 2;
    h = height;
  }

  const color = '#6a58f2';
  const strokeWidth = 2;

  const lineNode = rc.line(x, y, w, h, {
    stroke: color,
    disableMultiStroke: true,
    strokeLineDash: [15, 15],
    strokeWidth,
    roughness: 0,
  });

  const diameter = 4;
  const nodeOptions = {
    stroke: color,
    strokeWidth: 3,
    fill: color,
    fillStyle: 'solid',
    disableMultiStroke: true,
    roughness: 0,
  };

  const startNode = rc.circle(strokeWidth / 2, strokeWidth / 2, diameter, nodeOptions);

  const endNode = rc.circle(
    width - strokeWidth / 2,
    height - strokeWidth / 2,
    diameter,
    nodeOptions,
  );

  return [lineNode, startNode, endNode];
}
</script>
