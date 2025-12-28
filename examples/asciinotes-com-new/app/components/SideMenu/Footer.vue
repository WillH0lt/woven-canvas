<template>
  <div class="flex items-center justify-center w-full">
    <UDropdownMenu :items="accountItems">
      <div
        class="flex group gap-2 px-2 py-1 hover:bg-gray-200 mb-2 cursor-pointer rounded-lg transition-colors select-none"
      >
        <!-- <UAvatar
          :src="currentUser?.photoURL || ''"
          :alt="currentUser?.displayName || 'User Avatar'"
          size="xs"
          class="cursor-pointer"
        /> -->
        <div>
          {{ appStore.user?.name || "Account" }}
        </div>
        <!-- <UButton
          class="opacity-0 group-hover:opacity-100 pointer-events-none"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-ellipsis"
        /> -->
      </div>
    </UDropdownMenu>
  </div>
</template>

<script lang="ts" setup>
import { signOut } from "firebase/auth";

const auth = useFirebaseAuth()!;
const appStore = useAppStore();

const accountItems = ref([
  [
    {
      label: "Profile",
      icon: "i-lucide-user",
    },
    {
      label: "Billing",
      icon: "i-lucide-credit-card",
    },
    {
      label: "Settings",
      icon: "i-lucide-cog",
      to: "/settings",
    },
  ],
  [
    {
      label: "Logout",
      icon: "i-lucide-log-out",
      onSelect: async () => {
        await signOut(auth);

        window.location.href = "/";
      },
    },
  ],
]);
</script>
