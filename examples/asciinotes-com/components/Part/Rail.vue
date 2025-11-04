<template>
  <div ref="container" class="relative w-full h-full overflow-visible">
    <svg ref="line" class="w-full h-full"></svg>
  </div>
</template>

<script setup lang="ts">
import rough from 'roughjs';
import type { RoughSVG } from 'roughjs/bin/svg.js';

const container = useTemplateRef('container');
const lengthX = ref(0);
const lengthY = ref(0);
const line = useTemplateRef('line');
let rc: RoughSVG | null = null;

const { height } = useWindowSize();

onMounted(() => {
  const resizeObserver = new ResizeObserver(() => {
    if (!line.value || !container.value) return;

    // round up to the nearest 1000
    let newLengthX = 0;
    let newLengthY = 0;
    if (container.value.clientWidth > container.value.clientHeight) {
      newLengthX = 1000 * Math.ceil(container.value.clientWidth / 1000);
    } else {
      newLengthY = 1000 * Math.ceil(container.value.clientHeight / 1000);
    }

    if (lengthX.value === newLengthX && lengthY.value === newLengthY) return;

    while (line.value.firstChild) {
      line.value.removeChild(line.value.firstChild);
    }

    const node = getLineNode(Math.max(newLengthX, newLengthY));
    line.value.appendChild(node);

    lengthX.value = newLengthX;
    lengthY.value = newLengthY;
  });

  resizeObserver.observe(container.value!);
});

function getLineNode(length: number): SVGGElement {
  if (!line.value) {
    throw new Error('line element not found');
  }
  if (!container.value) {
    throw new Error('container element not found');
  }

  if (!rc) {
    rc = rough.svg(line.value);
  }

  const containerWidth = container.value.clientWidth;
  const containerHeight = container.value.clientHeight;

  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  if (containerWidth > containerHeight) {
    y = containerHeight / 2;
    w = length;
  } else {
    x = containerWidth / 2;
    h = length;
  }

  const newLine = rc.line(x, y, w, h, {
    stroke: '#30303099', // '#d94141',
    disableMultiStroke: true,
    strokeLineDash: [15, 15],
    strokeWidth: 1,
    roughness: 0,
  });

  return newLine;
}
</script>
