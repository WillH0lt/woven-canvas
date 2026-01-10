<script setup lang="ts">
import { watch } from "vue";
import { DeselectAll } from "@infinitecanvas/plugin-selection";

import ToolbarButton from "../ToolbarButton.vue";
import { CursorKind } from "../../cursors";
import { useEditorContext, useToolbar } from "../../composables";

const { nextEditorTick } = useEditorContext();

const { activeTool } = useToolbar();
watch(activeTool, (_, oldTool) => {
  if (oldTool === "select") {
    nextEditorTick((ctx) => {
      DeselectAll.spawn(ctx);
    });
  }
});
</script>

<template>
  <ToolbarButton name="select" tooltip="Select" :cursor="CursorKind.Select">
    <svg
      viewBox="0 0 20 20"
      style="fill-rule: evenodd; clip-rule: evenodd; stroke-miterlimit: 10"
    >
      <g transform="matrix(4.21053,0,0,4.21053,0.842105,0)">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="0.5"
          d="M2.39,2.88C2.38,2.885 2.34,2.9 2.33,2.91C2.32,2.91 2.298,2.939 2.28,2.97L1.51,4.41C1.44,4.54 1.41,4.6 1.37,4.61C1.34,4.62 1.3,4.61 1.27,4.6C1.24,4.58 1.22,4.51 1.18,4.37L0.16,0.41C0.13,0.28 0.11,0.22 0.13,0.18C0.15,0.15 0.17,0.13 0.21,0.12C0.25,0.12 0.31,0.14 0.42,0.2L4.01,2.14C4.14,2.21 4.2,2.24 4.21,2.28C4.22,2.31 4.21,2.35 4.2,2.38C4.18,2.41 4.11,2.43 3.97,2.47L2.39,2.88Z"
        />
      </g>
    </svg>
  </ToolbarButton>
</template>
