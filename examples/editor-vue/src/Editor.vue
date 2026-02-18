<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'

const clientId = crypto.randomUUID()
</script>

<template>
  <div class="editor">
    <WovenCanvas
      :store="{
        persistence: {
          documentId: 'editor-vue-test',
        },
        history: true,
        websocket: {
          documentId: 'editor-vue-test',
          url: 'ws://localhost:8087/ws',
          clientId: clientId,
        },
      }"
      :plugin-options="{ controls: { maxZoom: 3 } }"
      :background="{
        kind: 'dots',
        color: '#f4f4f4',
        strokeColor: '#a1a1a1',
        subdivisionStep: 5,
      }"
    >
      <!-- Example of custom block definitions:
      :editor="{
        components: [Shape],
        blockDefs: [
          {
            tag: 'shape',
            components: [Shape, Color, Text, VerticalAlign],
            resizeMode: 'free',
            editOptions: { canEdit: true },
          },
        ],
      }" -->

      <!-- <template #block:shape="blockData">
        <ShapeBlock v-bind="blockData" />
      </template> -->

      <!-- <template #floating-menu>
        <FloatingMenuBar>
          <template #button:shape="buttonData">
            <BorderButton v-bind="buttonData" />
          </template>
        </FloatingMenuBar>
      </template> -->

      <!-- <template #toolbar>
        <Toolbar>
          <template #tool:shape="toolData">
            <ShapeTool v-bind="toolData" />
          </template>
        </Toolbar>
      </template> -->
    </WovenCanvas>
  </div>
</template>

<style scoped>
.editor {
  background-color: white;
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

</style>
