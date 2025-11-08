<template>
  <div class="flex items-center justify-center w-full">
    <UDropdownMenu :items="accountItems">
      <div
        class="px-2 py-1 hover:bg-gray-200 mb-2 cursor-pointer rounded-lg transition-colors"
      >
        {{ currentUser?.displayName }}
      </div>
    </UDropdownMenu>
  </div>
</template>

<script lang="ts" setup>
import { signOut } from "firebase/auth";

const auth = useFirebaseAuth()!;
const currentUser = useCurrentUser();

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
    },
  ],
  [
    {
      label: "Logout",
      icon: "i-lucide-log-out",
      onSelect: async () => {
        await signOut(auth);
        window.location.reload();
      },
    },
  ],
]);
</script>
