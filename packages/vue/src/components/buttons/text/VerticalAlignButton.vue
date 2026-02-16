<script setup lang="ts">
import { computed } from "vue";
import type { EntityId } from "@woven-canvas/core";
import { VerticalAlign, VerticalAlignment } from "@woven-canvas/core";

import MenuButton from "../MenuButton.vue";
import { useComponents } from "../../../composables/useComponents";
import { useEditorContext } from "../../../composables/useEditorContext";

const props = defineProps<{
  entityIds: EntityId[];
}>();

const { nextEditorTick } = useEditorContext();

type VerticalAlignType =
  (typeof VerticalAlignment)[keyof typeof VerticalAlignment];

const alignments: VerticalAlignType[] = [
  VerticalAlignment.Top,
  VerticalAlignment.Center,
  VerticalAlignment.Bottom,
];

const verticalAlignsMap = useComponents(() => props.entityIds, VerticalAlign);

// Get current vertical alignment (null if mixed)
const currentAlignment = computed<VerticalAlignType | null>(() => {
  let alignment: VerticalAlignType | null = null;

  for (const va of verticalAlignsMap.value.values()) {
    const value = (va?.value ?? VerticalAlignment.Top) as VerticalAlignType;
    if (alignment === null) {
      alignment = value;
    } else if (alignment !== value) {
      return null; // Mixed alignments
    }
  }

  return alignment;
});

function cycleAlignment() {
  const current = currentAlignment.value ?? VerticalAlignment.Top;
  const currentIndex = alignments.indexOf(current);
  const nextAlignment = alignments[(currentIndex + 1) % alignments.length];

  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const va = VerticalAlign.write(ctx, entityId);
      va.value = nextAlignment;
    }
  });
}
</script>

<template>
  <MenuButton title="Vertical Align" @click="cycleAlignment">
    <!-- Top align -->
    <svg
      v-if="
        currentAlignment === VerticalAlignment.Top || currentAlignment === null
      "
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-align-vertical-justify-start-icon lucide-align-vertical-justify-start"
    >
      <rect width="14" height="6" x="5" y="16" rx="2" />
      <rect width="10" height="6" x="7" y="6" rx="2" />
      <path d="M2 2h20" />
    </svg>

    <!-- Center align -->
    <svg
      v-else-if="currentAlignment === VerticalAlignment.Center"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-align-vertical-justify-center-icon lucide-align-vertical-justify-center"
    >
      <rect width="14" height="6" x="5" y="16" rx="2" />
      <rect width="10" height="6" x="7" y="2" rx="2" />
      <path d="M2 12h20" />
    </svg>

    <!-- Bottom align -->
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-align-vertical-justify-end-icon lucide-align-vertical-justify-end"
    >
      <rect width="14" height="6" x="5" y="12" rx="2" />
      <rect width="10" height="6" x="7" y="2" rx="2" />
      <path d="M2 22h20" />
    </svg>
  </MenuButton>
</template>
