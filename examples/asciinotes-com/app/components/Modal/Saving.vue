<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20"
    @click.stop
  >
    <div
      class="relative w-full max-w-[420px] h-48 py-4 bg-gray-300 flex flex-col items-center rounded-lg"
    >
      <ElementLoadingIcon class="absolute top-1/3 left-1/2 transform -translate-y-1/2" />

      <div class="mt-32 text-2xl px-2">saving...</div>
    </div>
  </div>
</template>
