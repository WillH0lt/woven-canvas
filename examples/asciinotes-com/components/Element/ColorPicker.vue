<template>
  <div
    ref="triggerRef"
    class="flex justify-center items-center w-10 h-10 rounded-xl cursor-pointer hover:bg-darken transition-colors"
    :class="{
      'bg-darken': colorPickerVisible,
    }"
  >
    <div
      class="w-8 h-8 rounded-full cursor-pointer border-2 border-black"
      @click="showColorPicker"
      :style="{
        backgroundColor: color,
      }"
    ></div>
  </div>
  <div class="fixed inset-0" v-if="colorPickerVisible" @click.stop></div>
  <Teleport to="body">
    <StudioOverlay v-if="colorPickerVisible">
      <div
        ref="floatingRef"
        class="w-60 h-[328px] bg-gray-300 rounded-lg shadow p-2"
        :style="floatingStyles"
        v-on-click-outside="onBlur"
      >
        <input
          class="w-full mb-3 rounded text-center border-none focus:outline-none bg-gray-200"
          v-model="colorHex"
          @keydown.stop
        />
        <div ref="colorPickerRef" class="w-full flex justify-center"></div>
      </div>
    </StudioOverlay>
  </Teleport>
</template>

<script setup lang="ts">
import iro from '@jaames/iro';
import { useFloating, offset, flip, shift } from '@floating-ui/vue';
import tinycolor from 'tinycolor2';
import { vOnClickOutside } from '@vueuse/components';

const emit = defineEmits<{
  (e: 'blur'): void;
  (e: 'show'): void;
}>();

const color = defineModel<string>({ required: true });

interface Props {
  placement?: 'bottom' | 'top' | 'left' | 'right';
  offset?: number;
  shift?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom',
  offset: 5,
  shift: 16,
});

const colorPickerVisible = ref(false);
const triggerRef = ref<HTMLElement>();
const floatingRef = ref<HTMLElement>();
const colorPickerRef = ref<HTMLElement>();
let picker: iro.ColorPicker | null = null;

const { floatingStyles } = useFloating(triggerRef, floatingRef, {
  placement: props.placement,
  middleware: [
    offset({
      mainAxis: props.offset,
      crossAxis: props.shift,
    }),
    flip(),
    shift({
      padding: 16,
    }),
  ],
});

const colorHex = ref('');
watch(colorHex, async (v) => {
  const c = tinycolor(v);

  let str = v;
  if (!v.startsWith('#')) {
    str = `#${v}`;
  }

  if (c.isValid() && str.length === 7) {
    color.value = c.toHexString();
    picker?.color.set(c.toHexString());
  }
});

watch(
  color,
  (v) => {
    const c = tinycolor(v);
    if (c.isValid()) {
      colorHex.value = c.toHexString();
    }
  },
  { immediate: true },
);

async function showColorPicker() {
  colorPickerVisible.value = true;

  await nextTick();

  picker = iro.ColorPicker(colorPickerRef.value!, {
    width: 220,
    // margin: 40,
    color: color.value,
    layoutDirection: 'vertical',
    layout: [
      {
        component: iro.ui.Slider,
        options: {
          sliderType: 'hue',
        },
      },
      {
        component: iro.ui.Box,
      },
    ],
  });

  picker.on('color:change', (c: iro.Color) => {
    color.value = c.hexString;
  });

  emit('show');
}

function onBlur() {
  colorPickerVisible.value = false;
  emit('blur');
}
</script>

<style>
.IroHandle {
  cursor: grab;
}
</style>
