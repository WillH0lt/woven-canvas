<template>
  <input
    class="w-full py-2 px-4 mb-2 rounded bg-gray-500 text-white text-center border-none focus:outline-none"
    v-model="colorHex"
    @keydown.stop
  />
  <div ref="colorPickerRef" class="w-full flex justify-center"></div>
</template>

<script setup lang="ts">
import iro from '@jaames/iro';
import tinycolor from 'tinycolor2';

const color = defineModel<string>({ required: true });

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

const colorPickerRef = templateRef('colorPickerRef');
let picker: iro.ColorPicker | null = null;

onMounted(() => {
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
});
</script>
