<script setup lang="ts">
import { ref, inject, onUnmounted } from "vue";
import { Undo, Redo, getPluginResources, type Context } from "@woven-canvas/core";
import { RemoveSelected } from "@woven-canvas/plugin-selection";
import { useEditorContext } from "../composables/useEditorContext";
import { WOVEN_CANVAS_KEY } from "../injection";
import type { EditingPluginResources } from "../EditingPlugin";

const { getEditor } = useEditorContext();
const canvasContext = inject(WOVEN_CANVAS_KEY);

// Track undo/redo availability
const canUndo = ref(false);
const canRedo = ref(false);

// Register tick callback to update undo/redo state
if (canvasContext) {
  const unregister = canvasContext.registerTickCallback((ctx: Context) => {
    const { store } = getPluginResources<EditingPluginResources>(ctx, 'editing');
    canUndo.value = store.canUndo();
    canRedo.value = store.canRedo();
  });
  onUnmounted(unregister);
}

function handleUndo() {
  const editor = getEditor();
  editor?.command(Undo);
}

function handleRedo() {
  const editor = getEditor();
  editor?.command(Redo);
}

function handleDelete() {
  const editor = getEditor();
  editor?.command(RemoveSelected);
}
</script>

<template>
  <div class="wov-action-bar">
    <button class="wov-action-button" @click="handleUndo" aria-label="Undo">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo-icon lucide-undo">
        <path d="M3 7v6h6"/>
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
      </svg>
    </button>
    <button class="wov-action-button" @click="handleRedo" aria-label="Redo">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo-icon lucide-redo">
        <path d="M21 7v6h-6"/>
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
      </svg>
    </button>
    <button class="wov-action-button" @click="handleDelete" aria-label="Delete">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash">
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>
  </div>
</template>

<style>
/* Mobile action bar - only shown on touch devices */
.wov-action-bar {
  display: none;
}

@media (pointer: coarse) {
  .wov-action-bar {
    display: flex;
    width: fit-content;
    gap: 8px;
    padding: 4px 8px;
    margin-left: 10px;
    background-color: var(--wov-gray-200);
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    box-shadow:
      0px 0px 0.5px rgba(0, 0, 0, 0.18),
      0px 3px 8px rgba(0, 0, 0, 0.1),
      0px 1px 3px rgba(0, 0, 0, 0.1);
  }

  .wov-action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--wov-gray-700);
    border-radius: var(--wov-menu-border-radius);
  }

  .wov-action-button:hover {
    background-color: var(--wov-gray-200);
  }

  .wov-action-button:active {
    background-color: var(--wov-gray-300);
  }

  .wov-action-button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .wov-action-button svg {
    width: 14px;
    height: 14px;
    display: block;
    flex-shrink: 0;
  }
}
</style>
