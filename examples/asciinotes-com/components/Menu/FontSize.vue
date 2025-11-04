<template>
  <div
    class="bg-gray-700 drop-shadow-md rounded-xl text-white [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl cursor-default"
    v-on-click-outside="() => $emit('blur')"
  >
    <div
      class="flex items-center h-10 px-8 w-full transition-colors"
      :class="{
        'bg-primary': fontSize === option.value,
        'hover:bg-gray-600': fontSize !== option.value,
      }"
      v-for="option in FONT_SIZE_OPTIONS"
      @click="fontSize = option.value"
    >
      <div class="text-white w-4 mr-2 -ml-6" v-if="fontSize === option.value">
        <SvgoCheck />
      </div>
      <div :style="{ fontSize: `${option.displayValue}px` }">
        {{ option.label }}
      </div>
    </div>
    <div class="my-1 w-full h-[0.75px] bg-gray-600"></div>
    <div class="flex relative items-center justify-center w-full">
      <input
        class="bg-gray-700 w-full m-2 rounded-md"
        v-model="fontSizeText"
        @blur="updateFontSize"
        @keydown.enter="updateFontSize"
      />
      <div class="absolute right-4">px</div>
    </div>
    <!-- <div class="seperator-horizontal"></div> -->
    <!-- <div class="input-container">
          <input
            class="input"
            .value=${+(this.scrollyPart?.fontSize.toFixed(1) ?? '24')}
            @keydown=${(ev: KeyboardEvent) => {
              if (ev.key === 'Enter') {
                // blur input
                (ev.target as HTMLInputElement).blur();
              }
            }}
            @blur=${(ev: FocusEvent) => {
              this.handleFontUpdate(ev.target as HTMLInputElement);
            }}
          />
        </div> -->
  </div>
</template>
<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { FONT_SIZE_OPTIONS } from '@/constants';

defineEmits<{
  (e: 'blur'): void;
}>();

const fontSize = defineModel<number>({ required: true });
const fontSizeText = ref<string>('');

watch(
  fontSize,
  () => {
    const n = +fontSize.value.toFixed(1);
    fontSizeText.value = n.toString();
  },
  { immediate: true },
);

function updateFontSize() {
  fontSize.value = +fontSizeText.value;
}
</script>
