<template>
  <div
    class="flex items-center justify-center gap-4 w-full h-screen"
    :style="{ backgroundColor: color }"
  >
    <button
      v-for="color in colors"
      :key="color"
      class="w-24 h-8 rounded text-white cursor-pointer hover:brightness-110"
      :style="{ backgroundColor: color }"
      @click="setState({ color })"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { getState, setState, subscribe } from "./store";

const color = ref(getState().color);

subscribe(() => {
  color.value = getState().color;
});

const colors = ref(["#ff0000", "#00ff00", "#0000ff"]);
</script>
