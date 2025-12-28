<template>
  <div class="flex p-2 gap-2 min-w-64 justify-center">
    <UPopover modal>
      <UButton class="cursor-pointer" color="neutral" variant="soft">
        {{ iconModel }}
      </UButton>
      <template #content>
        <NuxtEmojiPicker
          :native="true"
          :hide-search="false"
          @select="onSelectEmoji"
          disable-sticky-group-names="true"
          :hide-group-names="true"
          :hide-group-icons="true"
          :disable-skin-tones="true"
          :static-texts="{}"
          :theme="colorMode.value as 'light' | 'dark'"
        ></NuxtEmojiPicker>
      </template>
    </UPopover>

    <UInput
      ref="renameInputRef"
      v-model="nameModel"
      type="text"
      placeholder="Enter page name"
      color="neutral"
      variant="soft"
    />
  </div>
</template>

<script lang="ts" setup>
const iconModel = defineModel<string>("icon", { required: true });
const nameModel = defineModel<string>("name", { required: true });
const renameInputRef = ref<any>(null);

const colorMode = useColorMode();

// Focus input when component mounts
onMounted(async () => {
  await nextTick();

  if (renameInputRef.value?.inputRef) {
    renameInputRef.value.inputRef.focus();
    renameInputRef.value.inputRef.select();
  }
});

interface EmojiData {
  i: string;
}

const onSelectEmoji = (emoji: EmojiData) => {
  iconModel.value = emoji.i;
};
</script>
