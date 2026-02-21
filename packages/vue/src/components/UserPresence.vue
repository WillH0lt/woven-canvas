<script setup lang="ts">
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import type { UserData } from "../injection";

const props = defineProps<{
  users: UserData[];
}>();

// Dropdown state
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

onClickOutside(containerRef, () => {
  isOpen.value = false;
});

// Get initials from name
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const MAX_VISIBLE = 4;

const userList = computed(() =>
  props.users.map((user) => ({
    sessionId: user.sessionId,
    name: user.name,
    color: user.color,
    avatar: user.avatar,
    initials: getInitials(user.name),
  })),
);

const visibleUsers = computed(() => userList.value.slice(0, MAX_VISIBLE));
</script>

<template>
  <div v-if="users.length > 1" ref="containerRef" class="wov-user-presence">
    <button
      class="wov-user-presence-trigger"
      :class="{ 'is-open': isOpen }"
      @click="isOpen = !isOpen"
    >
      <div class="wov-user-presence-avatars">
        <div
          v-for="user in visibleUsers"
          :key="user.sessionId"
          class="wov-user-avatar"
          :style="{ backgroundColor: user.avatar ? 'transparent' : user.color }"
        >
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.name"
            class="wov-user-avatar-img"
          />
          <template v-else>{{ user.initials }}</template>
        </div>
      </div>
    </button>

    <div v-if="isOpen" class="wov-user-presence-dropdown" @wheel.stop>
      <div class="wov-user-presence-list">
        <div
          v-for="user in userList"
          :key="user.sessionId"
          class="wov-user-presence-item"
        >
          <div
            class="wov-user-avatar wov-user-avatar-small"
            :style="{
              backgroundColor: user.avatar ? 'transparent' : user.color,
            }"
          >
            <img
              v-if="user.avatar"
              :src="user.avatar"
              :alt="user.name"
              class="wov-user-avatar-img"
            />
            <template v-else>{{ user.initials }}</template>
          </div>
          <span class="wov-user-presence-name">{{ user.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.wov-user-presence {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: var(--wov-z-ui);
}

.wov-user-presence-trigger {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wov-user-presence-trigger:hover,
.wov-user-presence-trigger.is-open {
  background-color: rgba(0, 0, 0, 0.08);
}

.wov-user-presence-avatars {
  display: flex;
  flex-direction: row-reverse;
}

.wov-user-presence-avatars .wov-user-avatar:not(:first-child) {
  margin-right: -12px;
}

.wov-user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid white;
  user-select: none;
}

.wov-user-avatar-small {
  width: 28px;
  height: 28px;
  font-size: 11px;
  flex-shrink: 0;
}

.wov-user-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.wov-user-presence-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.wov-user-presence-list {
  max-height: 240px;
  overflow-y: auto;
}

.wov-user-presence-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
}

.wov-user-presence-item:hover {
  background-color: #f9fafb;
}

.wov-user-presence-name {
  font-size: 13px;
  color: #374151;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
