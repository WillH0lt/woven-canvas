<template>
  <MenuButton
    ref="strokeButtonRef"
    data-tooltip="Stroke"
    @click="strokeMenuVisible = !strokeMenuVisible"
  >
    <SvgoStroke class="w-4" />
  </MenuButton>

  <MenuButton ref="fillButtonRef" data-tooltip="Fill" @click="fillMenuVisible = !fillMenuVisible">
    <SvgoHatchureFill class="w-4" />
  </MenuButton>

  <div ref="strokeMenuRef" :style="strokeMenuStyles">
    <MenuStroke
      class="w-32"
      v-if="strokeMenuVisible"
      v-model:kind="selectedPart.shapeStrokeKind"
      v-model:width="selectedPart.shapeStrokeWidth"
      v-model:roughness="selectedPart.shapeRoughness"
      v-model:color="selectedPart.shapeStrokeColor"
    />
  </div>

  <div ref="fillMenuRef" :style="fillMenuStyles">
    <MenuFill
      class="w-32"
      v-if="fillMenuVisible"
      v-model:color="selectedPart.shapeFillColor"
      v-model:kind="selectedPart.shapeFillKind"
      v-model:width="selectedPart.shapeFillWidth"
      v-model:hatchureGap="selectedPart.shapeHatchureGap"
      v-model:hatchureAngle="selectedPart.shapeHatchureAngle"
    />
  </div>
</template>

<script setup lang="ts">
const studioStore = useStudioStore();

const selectedPart = computed(() => studioStore.selectedPart!);

const strokeMenuVisible = ref(false);
const strokeButtonRef = ref<HTMLElement | null>(null);
const strokeMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: strokeMenuStyles } = useMenus(strokeButtonRef, strokeMenuRef, {
  offset: 2,
  placement: 'top',
});

const fillMenuVisible = ref(false);
const fillButtonRef = ref<HTMLElement | null>(null);
const fillMenuRef = ref<HTMLElement | null>(null);
const { floatingStyles: fillMenuStyles } = useMenus(fillButtonRef, fillMenuRef, {
  offset: 2,
  placement: 'top',
});

watch(strokeMenuVisible, (value) => {
  if (value) {
    fillMenuVisible.value = false;
  }
});

watch(fillMenuVisible, (value) => {
  if (value) {
    strokeMenuVisible.value = false;
  }
});
</script>
