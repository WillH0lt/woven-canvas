<template>
  <component
    :is="btnComponent"
    class="btn w-full h-full cursor-pointer text-inherit no-underline inline-block"
    v-bind="hrefAttributes"
    :class="[`btn-${part.buttonKind.toLowerCase()}`]"
  >
    <div :class="[`btn-first-${part.buttonKind.toLowerCase()}`]"></div>
    <div :class="[`btn-second-${part.buttonKind.toLowerCase()}`]"></div>

    <div
      ref="reference"
      class="w-full h-full flex items-center justify-center relative"
      :class="[
        `btn-face-${part.buttonKind.toLowerCase()}`,
        {
          hovered: hovered,
          selected: selected,
        },
      ]"
    >
      <PartText class="overflow-hidden select-none" :part="part" :typed="typed" singleLine>
        <slot></slot>
      </PartText>
    </div>

    <div :class="[`btn-last-${part.buttonKind.toLowerCase()}`]"></div>

    <Teleport to="body">
      <div ref="floating" v-if="edited" :style="floatingStyles">
        <MenuPart />
      </div>
    </Teleport>
  </component>
</template>

<script setup lang="ts">
import type { Part } from '@prisma/client';
import tinycolor from 'tinycolor2';

const props = defineProps<{
  part: Readonly<Part>;
  hovered?: boolean;
  selected?: boolean;
  edited?: boolean;
  typed?: boolean;
  live?: boolean;
}>();

const reference = useTemplateRef('reference');
const floating = useTemplateRef('floating');

const { floatingStyles } = useMenus(reference, floating, { placement: 'top' });

const isRelativeLink = computed(() => {
  return !props.part.href?.startsWith('http');
});

const btnComponent = computed(() => {
  if (props.live && isRelativeLink.value) {
    return 'router-link';
  } else {
    return 'a';
  }
});

const hrefAttributes = computed(() => {
  if (!props.live) {
    return {};
  }

  if (isRelativeLink.value) {
    return {
      to: props.part.href,
      replace: ['/signup', '/login'].includes(props.part.href),
      target: '_self',
      rel: 'noopener',
    };
  }

  return {
    href: props.part.href,
    target: '_blank',
  };
});

const isDark = computed(() => {
  return tinycolor(props.part.backgroundColor).isDark();
});

const hoverBrightness = computed(() => {
  if (isDark.value) {
    return 1.25;
  }
  return 1.05;
});

const darkBackgroundHsl = computed(() => {
  const hsl = tinycolor(props.part.backgroundColor).toHsl();
  hsl.l = 0.32;
  return `hsl(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%)`;
});

const darkestBackgroundHsl = computed(() => {
  const hsl = tinycolor(props.part.backgroundColor).toHsl();
  hsl.l = 0.16;
  return `hsl(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%)`;
});
</script>

<style>
.btn {
  transition: filter 300ms;
}

.btn:hover {
  filter: brightness(v-bind(hoverBrightness));
}

/* rounded */

.btn-rounded {
  border-radius: 10px;
}

.runner-container .btn-rounded {
  border-radius: calc(10 * 1rem);
}

/* pill */

.btn-pill {
  border-radius: 999999999px;
}

/* realistic */

.btn-realistic {
  background-color: transparent !important;

  transition: filter 250ms;
}
.btn-first-realistic {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: hsl(0deg 0% 0% / 0.25);
  will-change: transform;
  transform: translateY(2px);
  transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
.btn-second-realistic {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(
    to left,
    v-bind('darkestBackgroundHsl') 0%,
    v-bind('darkBackgroundHsl') 8%,
    v-bind('darkBackgroundHsl') 92%,
    v-bind('darkestBackgroundHsl') 100%
  );
}
.btn-face-realistic {
  border-radius: 12px;
  background: v-bind('part.backgroundColor');
  will-change: transform;
  transform: translateY(-4px);
  transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

.btn-face-realistic:hover {
  filter: brightness(v-bind(hoverBrightness));
}
.btn-realistic:hover .btn-face-realistic {
  transform: translateY(-6px);
  transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
}
.btn-realistic:active .btn-face-realistic {
  transform: translateY(-2px);
  transition: transform 34ms;
}
.btn-realistic:hover .btn-realistic-first {
  transform: translateY(4px);
  transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
}
.btn-realistic:active .btn-realistic-first {
  transform: translateY(1px);
  transition: transform 34ms;
}
.btn-realistic:focus:not(:focus-visible) {
  outline: none;
}

/* offset */

.btn-offset {
  background-color: transparent !important;
}

.btn-first-offset {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background-color: #111;
  transform: translate(8px, 8px);
  transition: transform 0.2s ease-out;
}

.btn-last-offset {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  outline: 2px solid #111;
  border-radius: 8px;
  background-color: v-bind('part.backgroundColor');
}

.btn-face-offset {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}

.btn-offset:hover .btn-first-offset {
  transform: translate(0, 0);
}

.btn-offset:active .btn-first-offset {
  transform: translate(0, 0);
}

.btn-offset:active .btn-face-offset {
  transform: translate(2px, 2px);
}

.btn-offset:active .btn-last-offset {
  border: 2px solid #111;
}

/* Block */

.btn-block {
  background-color: transparent !important;
}

.btn-first-block {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: v-bind('part.backgroundColor');

  outline: 2px solid #000;
  outline-offset: -2px;
  transition: transform 0.2s ease-out;
}

.btn-second-block {
  position: absolute;
  background: v-bind('darkBackgroundHsl');
  outline: 2px solid #000;
  outline-offset: -2px;
  width: 10px;
  height: 100%;
  top: 10px;
  right: -10px;
  transform: skew(0, 45deg);
  transform-origin: bottom right;
  z-index: -2;

  background-size: 5px 7px;
  background-image: linear-gradient(
    0deg,
    v-bind('part.backgroundColor') 25%,
    v-bind('part.backgroundColor') 25%,
    v-bind('part.backgroundColor') 50%,
    black 50%,
    black 75%,
    v-bind('part.backgroundColor') 75%,
    v-bind('part.backgroundColor')
  );
  transition: transform 0.2s ease-out;
}

.btn-face-block {
  transition: transform 0.2s ease-out;
}

.btn-block .btn-last-block {
  position: absolute;
  background: black;
  outline: 2px solid #000;
  outline-offset: -2px;
  width: 100%;
  height: 10px;
  top: 100%;
  left: 10px;
  transform-origin: bottom right;
  transform: skew(45deg);
  z-index: -1;
  transition: transform 0.2s ease-out;
}

.btn-block:hover .btn-first-block {
  transform: translate(5px, 5px);
}

.btn-block:hover .btn-second-block {
  transform: skew(0, 45deg) scaleX(0.5);
}

.btn-block:hover .btn-last-block {
  transform: skew(45deg) scaleY(0.5);
}

.btn-block:active .btn-first-block {
  transform: translate(10px, 10px);
}

.btn-block:active .btn-second-block {
  transform: skew(0, 45deg) scaleX(0);
}

.btn-block:active .btn-last-block {
  transform: skew(45deg) scaleY(0);
}

.btn-block:hover .btn-face-block {
  transform: translate(5px, 5px);
}

.btn-block:active .btn-face-block {
  transform: translate(10px, 10px);
}
</style>
