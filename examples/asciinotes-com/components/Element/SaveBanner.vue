<template>
  <div
    class="fixed bottom-4 left-1/2 -translate-x-1/2 p-2 rounded drop-shadow-lg border border-gray-200 transition-colors"
    :class="{
      'bg-white': !highlighted,
      'bg-error text-white': highlighted,
    }"
  >
    <div v-if="error" class="flex items-center">
      <div
        class="text-sm max-w-96"
        :class="{
          'text-error': !highlighted,
          'text-white': highlighted,
        }"
      >
        {{ error }}
      </div>
      <button class="text-sm hover:text-gray-700 hover:underline ml-12" @click="$emit('reset')">
        Reset
      </button>
    </div>
    <div v-else class="flex flex-col lg:flex-row items-center">
      <div class="my-2 whitespace-nowrap">Careful - you have unsaved changes!</div>
      <div class="flex gap-4 lg:ml-24">
        <button class="text-sm hover:text-gray-700 hover:underline" @click="$emit('reset')">
          Reset
        </button>
        <ElementButton
          class="h-12 w-32"
          @click="$emit('save')"
          :disabled="!canSave"
          :loading="saving"
        >
          Save Changes
        </ElementButton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineEmits(['reset', 'save']);

interface Props {
  saving?: boolean;
  canSave?: boolean;
  error?: string | null;
}

withDefaults(defineProps<Props>(), {
  canSave: true,
});

const highlighted = ref<number | null>(null);
function highlight() {
  let value = Date.now();
  highlighted.value = value;
  setTimeout(() => {
    if (highlighted.value === value) {
      highlighted.value = null;
    }
  }, 2000);
}

defineExpose({
  highlight,
});
</script>
