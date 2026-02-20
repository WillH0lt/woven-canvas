<script setup lang="ts">
import { WovenCanvas, SelectTool, HandTool, Toolbar } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { TntPlugin, Tnt, Rock } from './TntPlugin'
import TntBlock from './TntBlock.vue'
import RockBlock from './RockBlock.vue'
import TntTool from './TntTool.vue'
import RockTool from './RockTool.vue'
import ExplodeButton from './ExplodeButton.vue'

// Block definitions for TNT and Rock
const blockDefs = [
  {
    tag: 'tnt',
    components: [Tnt],
  },
  {
    tag: 'rock',
    components: [Rock],
  },
]
</script>

<template>
  <WovenCanvas :editor="{ plugins: [TntPlugin], blockDefs }">
    <!-- Toolbar with placement tools -->
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <HandTool />
        <TntTool />
        <RockTool />
      </Toolbar>
    </template>

    <!-- Block renderers -->
    <template #block:tnt="props">
      <TntBlock v-bind="props" />
    </template>

    <template #block:rock="props">
      <RockBlock v-bind="props" />
    </template>

    <!-- External UI: Explode button -->
    <template #default>
      <div class="ui-overlay">
        <ExplodeButton />
        <div class="hint">Press Space to explode</div>
      </div>
    </template>
  </WovenCanvas>
</template>

<style scoped>
.ui-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  z-index: 100;
  pointer-events: auto;
}

.hint {
  font-size: 12px;
  color: var(--ic-gray-400);
  background: var(--ic-gray-800);
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
