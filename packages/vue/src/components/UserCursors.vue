<script setup lang="ts">
import { computed } from "vue";
import type { UserData } from "../injection";

// Cursor SVG path (select cursor)
const CURSOR_PATH =
  "M2.39,2.88s-.04.01-.05.02c-.01,0-.02.01-.03.02,0,.01-.02.02-.03.05l-.77,1.44c-.07.13-.1.19-.14.2-.03.01-.07,0-.1-.01-.03-.02-.05-.09-.09-.23L.16.41c-.03-.13-.05-.19-.03-.23.02-.03.04-.05.08-.06.04,0,.1.02.21.08l3.59,1.94c.13.07.19.1.2.14.01.03,0,.07-.01.1-.02.03-.09.05-.23.09l-1.58.4Z";

const props = defineProps<{
  users: UserData[];
  currentSessionId: string;
  camera: { left: number; top: number; zoom: number };
}>();

// Filter out the current user and compute screen positions
const otherUsers = computed(() =>
  props.users
    .filter((user) => user.sessionId !== props.currentSessionId)
    .map((user) => ({
      ...user,
      screenX: (user.position[0] - props.camera.left) * props.camera.zoom,
      screenY: (user.position[1] - props.camera.top) * props.camera.zoom,
    })),
);
</script>

<template>
  <div class="wov-user-cursors">
    <div
      v-for="user in otherUsers"
      :key="user.sessionId"
      class="wov-user-cursor"
      :style="{
        transform: `translate(${user.screenX}px, ${user.screenY}px)`,
      }"
    >
      <svg class="wov-cursor-svg" viewBox="0 0 4.35 4.75" width="20" height="20">
        <path
          :fill="user.color"
          stroke="#fff"
          stroke-miterlimit="10"
          stroke-width=".25"
          :d="CURSOR_PATH"
        />
      </svg>
      <span class="wov-cursor-label" :style="{ backgroundColor: user.color }">
        {{ user.name }}
      </span>
    </div>
  </div>
</template>

<style>
.wov-user-cursors {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: var(--wov-z-cursors);
}

.wov-user-cursor {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
  transition: transform 100ms ease-out;
}

.wov-cursor-svg {
  display: block;
}

.wov-cursor-label {
  position: absolute;
  top: 16px;
  left: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: white;
  white-space: nowrap;
  user-select: none;
}
</style>
