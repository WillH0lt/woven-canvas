<template>
  <div
    class="w-full max-w-36 py-2 bg-primary-light flex flex-col items-center gap-2 rounded-lg shadow"
    v-on-click-outside="() => $emit('close')"
  >
    <div
      class="w-full px-8 py-2 flex flex-col gap-2 hover:bg-gray-100 transition-colors cursor-pointer"
      @click="logout"
    >
      <div class="flex items-center">
        <div class="mr-auto text-lg">Logout</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components';
import { signOut } from 'firebase/auth';

defineEmits(['close']);

const auth = useFirebaseAuth()!;

async function logout() {
  await signOut(auth);
  window.location.reload();
}
</script>
