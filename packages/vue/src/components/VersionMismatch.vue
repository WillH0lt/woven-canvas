<script setup lang="ts">
defineProps<{
  versionMismatch: boolean;
}>();

function reloadPage() {
  window.location.reload();
}
</script>

<template>
  <div v-if="versionMismatch" class="ic-version-mismatch-overlay">
    <div class="ic-version-mismatch-dialog">
      <p>A new version is available.</p>
      <p>Please refresh the page to continue.</p>
      <button @click="reloadPage">Refresh</button>
    </div>
  </div>
</template>

<style>
.ic-version-mismatch-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.ic-version-mismatch-dialog {
  background: var(--ic-gray-50);
  color: var(--ic-gray-900);
  border-radius: 12px;
  padding: 24px 32px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.ic-version-mismatch-dialog p {
  margin: 0 0 8px;
  font-size: 14px;
}

.ic-version-mismatch-dialog button {
  margin-top: 12px;
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: var(--ic-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.ic-version-mismatch-dialog button:hover {
  background: var(--ic-primary-light);
}
</style>
