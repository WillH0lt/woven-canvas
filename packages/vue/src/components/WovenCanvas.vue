<script setup lang="ts">
/**
 * WovenCanvas — thin wrapper that provides an internal <Suspense> boundary
 * so consumers never need to add one themselves.
 *
 * All props, events, and slots are forwarded transparently to WovenCanvasCore.
 */
import { ref } from 'vue'
import WovenCanvasCore from './WovenCanvasCore.vue'

defineOptions({ inheritAttrs: false })

// Forward the imperative render control (for `autoRender: false` consumers) through
// the Suspense boundary, so a `ref` on <WovenCanvas> can drive frames manually.
const core = ref<InstanceType<typeof WovenCanvasCore> | null>(null)
defineExpose({
  render: () => core.value?.render(),
})
</script>

<template>
  <Suspense>
    <WovenCanvasCore ref="core" v-bind="$attrs">
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData ?? {}" />
      </template>
    </WovenCanvasCore>
  </Suspense>
</template>
