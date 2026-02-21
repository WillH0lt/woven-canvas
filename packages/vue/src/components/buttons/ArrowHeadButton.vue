<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { hasComponent, type EntityId } from "@woven-canvas/core";
import {
  ElbowArrow,
  ArcArrow,
  ArrowHeadKind,
} from "@woven-canvas/plugin-arrows";

import MenuDropdown from "./MenuDropdown.vue";
import IconChevronDown from "../icons/IconChevronDown.vue";
import { useEditorContext } from "../../composables/useEditorContext";
import { ARROW_HEADS, getArrowHead, type ArrowHeadDef } from "../../arrowHeads";

type ArrowSide = "start" | "end";

const props = defineProps<{
  entityIds: EntityId[];
  side: ArrowSide;
}>();

const { nextEditorTick } = useEditorContext();

const currentHead = shallowRef<ArrowHeadKind | null>(null);

const currentHeadDef = computed(() => {
  const kind =
    currentHead.value ??
    (props.side === "start" ? ArrowHeadKind.None : ArrowHeadKind.V);
  return getArrowHead(kind);
});

// Update current arrow head on each tick
nextEditorTick((ctx) => {
  let first: ArrowHeadKind | null = null;

  for (const entityId of props.entityIds) {
    if (hasComponent(ctx, entityId, ElbowArrow)) {
      const arrow = ElbowArrow.read(ctx, entityId);
      const head =
        props.side === "start" ? arrow.startArrowHead : arrow.endArrowHead;
      if (first === null) {
        first = head;
      } else if (head !== first) {
        // Mixed selection - use default based on end type
        currentHead.value =
          props.side === "start" ? ArrowHeadKind.None : ArrowHeadKind.V;
        return;
      }
    }
    if (hasComponent(ctx, entityId, ArcArrow)) {
      const arrow = ArcArrow.read(ctx, entityId);
      const head =
        props.side === "start" ? arrow.startArrowHead : arrow.endArrowHead;
      if (first === null) {
        first = head;
      } else if (head !== first) {
        // Mixed selection - use default based on end type
        currentHead.value =
          props.side === "start" ? ArrowHeadKind.None : ArrowHeadKind.V;
        return;
      }
    }
  }

  currentHead.value = first;
});

function handleSelect(head: ArrowHeadKind) {
  currentHead.value = head;

  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      if (hasComponent(ctx, entityId, ElbowArrow)) {
        const arrow = ElbowArrow.write(ctx, entityId);
        if (props.side === "start") {
          arrow.startArrowHead = head;
        } else {
          arrow.endArrowHead = head;
        }
      }
      if (hasComponent(ctx, entityId, ArcArrow)) {
        const arrow = ArcArrow.write(ctx, entityId);
        if (props.side === "start") {
          arrow.startArrowHead = head;
        } else {
          arrow.endArrowHead = head;
        }
      }
    }
  });
}

function getSvg(def: ArrowHeadDef | undefined): string {
  if (!def) return "";
  const isStart = props.side === "start";
  const headX = isStart ? 4 : 20;
  const transform = `translate(${headX}, 12) scale(${isStart ? "-0.8, 0.8" : "0.8"})`;
  return `<line x1="${isStart ? 8 : 4}" y1="12" x2="${isStart ? 20 : 16}" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><g transform="${transform}">${def.svg}</g>`;
}
</script>

<template>
  <MenuDropdown
    :title="side === 'start' ? 'Start Arrow Head' : 'End Arrow Head'"
  >
    <template #button>
      <div class="wov-menu-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          v-html="getSvg(currentHeadDef)"
        ></svg>
        <IconChevronDown class="wov-chevron-down" />
      </div>
    </template>

    <template #dropdown>
      <button
        v-for="headDef in ARROW_HEADS"
        :key="headDef.kind"
        class="wov-menu-option"
        :class="{ 'is-active': currentHead === headDef.kind }"
        @click="handleSelect(headDef.kind)"
      >
        <!-- :title="headDef.label" -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          v-html="getSvg(headDef)"
        ></svg>
      </button>
    </template>
  </MenuDropdown>
</template>
