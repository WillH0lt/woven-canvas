<template>
  <button
    @click="$emit('click')"
    :disabled="disabled"
    class="jet-btn"
    :class="`jet-btn-${theme}`"
  >
    <slot name="default">{{ text }}</slot>
  </button>
</template>

<script setup lang="ts">
import { defineComponent } from "vue";

defineComponent({
  name: "JetButton",
});
defineProps({
  text: { type: String, required: false },
  disabled: { type: Boolean, default: false },
  size: {
    type: String as () => "sm" | "md" | "lg",
    default: "md",
  },
  theme: {
    type: String as () =>
      | "primary"
      | "secondary"
      | "success"
      | "warning"
      | "danger"
      | "default",
    default: "default",
  },
});
defineEmits(["click"]);
</script>

<style scoped>
.jet-btn {
  display: inline-flex;
  border-radius: 5px;
  padding: 10px 16px;
  border: none;
  outline: none;
  box-shadow: none;
  &.jet-btn-primary {
    background: #535bf2;
    color: #fff;
  }
  &.jet-btn-secondary {
    background: #dfdfe7;
    color: #2b2b2f;
  }
  &.jet-btn-success {
    background: #46c778;
    color: #fff;
  }
  &.jet-btn-warning {
    background: #dc6920;
    color: #fff;
  }
  &.jet-btn-danger {
    background: #e73147;
    color: #fff;
  }
  &.jet-btn-default {
    background: #f0f0f5;
    color: #2b2b2f;
  }
}
</style>
