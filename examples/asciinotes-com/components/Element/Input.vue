<template>
  <div
    class="flex flex-col"
    :class="{
      'text-gray-400': disabled,
    }"
  >
    <div class="flex items-end mb-2" v-if="title || titlePremium">
      <div class="text-sm font-bold" v-if="title">
        {{ title }}
      </div>
      <ElementPremiumBadge v-if="titlePremium"></ElementPremiumBadge>
    </div>
    <div class="relative flex-1">
      <input
        class="w-full py-2 px-4 rounded border-none focus:outline-none placeholder:text-gray-400"
        :class="{
          'outline outline-error': error,
          lowercase: lowercase,
        }"
        :style="{
          background,
        }"
        :type="type"
        :placeholder="placeholder"
        :maxlength="maxlength"
        v-model="value"
        :disabled="disabled"
        @blur="onBlur"
        @focus="onFocus"
        @input="$emit('input')"
      />
      <span v-if="suffix" class="absolute right-4 top-2">{{ suffix }}</span>
    </div>
    <div v-if="error" class="text-error text-xs">{{ error }}</div>
    <div v-else-if="tip" class="text-xs mt-2">{{ focused ? tip : '' }}&#8203;</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  titlePremium?: boolean;
  placeholder?: string;
  maxlength?: number;
  disabled?: boolean;
  error?: string | null;
  type?: string;
  tip?: string;
  suffix?: string;
  lowercase?: boolean;
  background?: string;
}

withDefaults(defineProps<Props>(), {
  background: 'var(--color-gray-200)',
});

const value = defineModel<string | null>({ required: true });
const emit = defineEmits(['input', 'blur']);

const focused = ref(false);

function onFocus() {
  focused.value = true;
}

function onBlur() {
  focused.value = false;
  emit('blur');
}
</script>
