<template>
  <div
    class="flex items-center justify-center"
    :class="{
      'text-xs': size === 'xs',
      'text-sm': size === 'sm',
      'text-md': size === 'md',
      'text-lg': size === 'lg',
      'text-xl': size === 'xl',
    }"
  >
    {{ char }}
  </div>
</template>

<script lang="ts" setup>
interface Props {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

withDefaults(defineProps<Props>(), {
  size: "md",
});

const char = ref("|");

const cycle = ["|", "/", "-", "\\"];

onMounted(() => {
  setInterval(() => {
    char.value = cycle[(cycle.indexOf(char.value) + 1) % cycle.length]!;
  }, 100);
});
</script>
