<template>
  <div
    ref="containerRef"
    class="w-full h-full"
    :class="{
      hovered: hovered,
      selected: selected,
    }"
  >
    <svg class="w-full h-full overflow-visible" :viewBox="`0 0 ${part.width} ${part.height}`">
      <g>
        <path v-if="fillInfo" v-bind="fillInfo" />
        <path v-if="strokeInfo" v-bind="strokeInfo" />
      </g>
    </svg>
    <Teleport to="body">
      <div ref="floating" v-if="edited" :style="floatingStyles">
        <MenuPart :shapeButtonVisible="true" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import rough from 'roughjs';
import type { Drawable, Options, PathInfo as RoughPathInfo } from 'roughjs/bin/core';
import type { RoughGenerator } from 'roughjs/bin/generator';
import { ShapeKind, ShapeStrokeKind } from '@prisma/client';
import type { Part } from '@prisma/client';

import { pseudorandom, kebabCase } from '~/utils.js';
import verticesMap from '~/shapes.json';

const props = defineProps<{
  part: Readonly<Part>;
  hovered?: boolean;
  selected?: boolean;
  edited?: boolean;
}>();

const floating = useTemplateRef('floating');
const containerRef = useTemplateRef('containerRef');

const { floatingStyles } = useMenus(containerRef, floating, { placement: 'top' });

let rc: RoughGenerator | null = null;

interface PathInfo {
  d: string;
  stroke: string;
  fill?: string;
  'stroke-width'?: number;
  'stroke-dasharray'?: string;
  'stroke-linecap'?: 'round' | 'butt' | 'square' | 'inherit' | undefined;
  'stroke-linejoin'?: 'round' | 'bevel' | 'miter' | 'inherit' | undefined;
}

const fillInfo = ref<PathInfo | null>(null);
const strokeInfo = ref<PathInfo | null>(null);

watchEffect(() => {
  const { fillInfo: f, strokeInfo: s } = getPathInfo();
  fillInfo.value = f;
  strokeInfo.value = s;
});

function getPathInfo(): { strokeInfo: PathInfo | null; fillInfo: PathInfo | null } {
  if (!rc) {
    rc = rough.generator();
  }

  const { width, height } = props.part;
  // const width = 0.9 * props.part.width;
  // const height = 0.9 * props.part.height;

  let shapeNode: Drawable | null = null;

  const options: Options = {
    stroke: props.part.shapeStrokeColor,
    strokeWidth: props.part.shapeStrokeWidth,
    disableMultiStroke: props.part.shapeStrokeKind !== ShapeStrokeKind.Solid,
    fill: props.part.shapeFillColor || 'black',
    fillStyle: kebabCase(props.part.shapeFillKind),
    hachureGap: props.part.shapeHatchureGap,
    hachureAngle: props.part.shapeHatchureAngle,
    disableMultiStrokeFill: true,
    seed: pseudorandom(props.part.id),
    roughness: props.part.shapeRoughness,
    preserveVertices: true,
  };

  if (props.part.shapeStrokeKind === ShapeStrokeKind.Dashed) {
    options.strokeLineDash = [3 * props.part.shapeStrokeWidth, 3 * props.part.shapeStrokeWidth];
  } else if (props.part.shapeStrokeKind === ShapeStrokeKind.Dotted) {
    options.strokeLineDash = [props.part.shapeStrokeWidth, 3 * props.part.shapeStrokeWidth];
  }

  if (props.part.shapeKind === ShapeKind.Ellipse) {
    shapeNode = rc.ellipse(width / 2, height / 2, width, height, options);
  } else {
    const name = props.part.shapeKind.toString().toLowerCase() as keyof typeof verticesMap;
    if (!verticesMap[name]) {
      throw new Error(`Unknown shape kind: ${name}`);
    }

    const vertices = verticesMap[name].map(([x, y]) => [x * width, y * height]) as [
      number,
      number,
    ][];

    shapeNode = rc.polygon(vertices, options);
  }

  const paths = rc.toPaths(shapeNode);

  let fillInfo: PathInfo | null = toPathInfo(paths[0], undefined, props.part.shapeFillWidth);
  if (props.part.shapeFillKind === 'None') {
    fillInfo = null;
  }

  let strokeInfo: PathInfo | null = toPathInfo(
    paths[1],
    options.strokeLineDash ? options.strokeLineDash.join(' ') : undefined,
    options.strokeWidth,
  );
  if (props.part.shapeStrokeKind === ShapeStrokeKind.None) {
    strokeInfo = null;
  }

  return {
    fillInfo,
    strokeInfo,
  };
}

function toPathInfo(
  path: RoughPathInfo,
  dashArray: string | undefined,
  strokeWidth: number | undefined,
): PathInfo {
  const pathInfo: PathInfo = {
    d: path.d,
    fill: path.fill,
    stroke: path.stroke,
  };

  if (dashArray) {
    pathInfo['stroke-dasharray'] = dashArray;
  }

  if (strokeWidth) {
    pathInfo['stroke-width'] = strokeWidth;
  }

  pathInfo['stroke-linecap'] = 'round';
  pathInfo['stroke-linejoin'] = 'round';

  return pathInfo;
}
</script>
