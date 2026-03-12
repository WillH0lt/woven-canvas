<script setup lang="ts">
/**
 * WovenCanvas — thin wrapper that provides an internal <Suspense> boundary
 * so consumers never need to add one themselves.
 *
 * All props, events, and slots are forwarded transparently to WovenCanvasCore.
 */
import WovenCanvasCore from "./WovenCanvasCore.vue";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <Suspense>
    <WovenCanvasCore v-bind="$attrs">
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData ?? {}" />
      </template>
    </WovenCanvasCore>
  </Suspense>
</template>
