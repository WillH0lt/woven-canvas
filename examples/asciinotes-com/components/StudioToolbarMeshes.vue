<template>
  <div>
    <img
      class="aspect-square w-full translate-y-2 cursor-pointer rounded-lg"
      :style="{
        'pointer-events': meshesVisible ? 'none' : 'auto',
      }"
      :src="`/img/squiggle.${hovered ? 'webp' : 'png'}`"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @click="meshesVisible = true"
    />

    <Teleport to="body" v-if="meshesVisible">
      <StudioOverlay>
        <div
          class="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 bg-gray-300 border border-black rounded-t-lg overflow-x-hidden z-50"
          v-on-click-outside="() => (meshesVisible = false)"
          @click.stop
          @wheel.stop
        >
          <div class="w-full h-16 flex">
            <input
              class="flex-1 h-full px-4 py-2 text-xl bg-white text-black border-0 focus:ring-0"
              type="text"
              v-model="text"
              placeholder="Search"
              @keydown.enter="search"
            />
            <div
              class="flex items-center justify-center aspect-square flex-shrink-0 h-full bg-white hover:bg-[#f0f0f0] transition-colors cursor-pointer"
              @click="search"
            >
              <svgoSearch class="w-10" />
            </div>
          </div>
          <MeshGrid
            class="w-full h-96"
            :search="searchText"
            default-search="fruit"
            @select="
              (model: string) => {
                meshesVisible = false;
                $emit('select', {
                  tag: PartTag.Mesh,
                  width: 200,
                  height: 200,
                  src: model,
                });
              }
            "
          />
        </div>
      </StudioOverlay>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';
import { vOnClickOutside } from '@vueuse/components';

defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const meshesVisible = ref(false);
const hovered = ref(false);

const text = ref('');
const searchText = ref('');
async function search() {
  searchText.value = text.value;
  text.value = '';
}
</script>
<style scoped>
input:focus {
  outline: none;
}
</style>
