<template>
  <div class="jet-empty">
    <slot name="default">{{text || "No results xxxx"}}</slot>
  </div>
</template>

<script setup lang="ts">
import {defineComponent} from "vue";

defineComponent({
  name: "JetEmpty",
});
defineProps({
  text: { type: String, required: false },
})
defineEmits(["click"]);
</script>

<style scoped>
.jet-empty{
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid rgba(0,0,0,.1);
  outline: none;
  box-shadow: none;
}
</style>
