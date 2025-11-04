<template>
  <div class="grid grid-flow-col grid-rows-2 gap-2 w-full justify-center">
    <div
      v-for="c in palette"
      class="w-5 h-5 rounded-full outline"
      :class="{
        'outline-2 outline-primary outline-offset-2': c === color,
        'outline-1 outline-[#ffffff55]': c !== color,
      }"
      :style="{
        backgroundColor: c,
      }"
      :key="c"
      @click="selectColor(c)"
    ></div>
    <div
      class="rainbow w-5 h-5 rounded-full outline"
      :class="{
        'outline-2 outline-primary outline-offset-2': isCustomColor,
        'outline-1 outline-[#ffffff55]': !isCustomColor,
      }"
      @click="$emit('showPicker')"
    ></div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'select', c: string): void;
  (e: 'showPicker'): void;
}>();

interface Props {
  palette?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  palette: () => [
    '#000000',
    '#434343',
    '#ff3e41',
    '#ff8a43',
    '#ffeb7f',
    '#00c9a7',
    '#007ea7',
    '#6a58f2',
    '#ffffff',
  ],
});

const color = defineModel<string>({ required: true });

const isCustomColor = computed(() => !props.palette.includes(color.value));

async function selectColor(c: string): Promise<void> {
  color.value = c;
  await nextTick();
  emit('select', c);
}
</script>
<style scoped>
.rainbow {
  background: radial-gradient(50% 50% at 50% 50%, #ffffff 0%, transparent 100%),
    conic-gradient(
      from 0deg at 50% 50%,
      red,
      #ffa800 47.73deg,
      #ff0 79.56deg,
      #0f0 121.33deg,
      #0ff 180.99deg,
      #00f 238.67deg,
      #f0f 294.36deg,
      red 360deg
    ),
    #c4c4c4;
}
</style>
