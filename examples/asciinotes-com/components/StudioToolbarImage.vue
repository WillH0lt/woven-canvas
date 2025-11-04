<template>
  <img
    class="cursor-pointer px-2 transition-transform hover:scale-110 duration-200"
    src="/img/camera.png"
    @click="handleUploadPressed"
  />
  <!-- @mouseenter="hovered = true"
    @mouseleave="hovered = false" -->
</template>

<script setup lang="ts">
import { v4 as uuid } from 'uuid';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PartTag } from '@prisma/client';
import type { Part } from '@prisma/client';

const emit = defineEmits<{
  (e: 'select', part: Partial<Part>): void;
}>();

const appStore = useAppStore();

const hovered = ref(false);
const route = useRoute();
const user = useCurrentUser();
const storage = useFirebaseStorage();
const storageBucketRef = computed(() => {
  const pageId = route.params.pageId as string;
  return storageRef(storage, `/users/${user.value?.uid}/pages/${pageId}/assets`);
});

async function handleUploadPressed() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function () {
    if (!input.files) return;

    const file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
      appStore.notify('File size is too large. Max size is 10MB.');
      return;
    }

    let { width: srcWidth, height: srcHeight } = await getImageDimensions(file);

    const size = 200;

    let width = srcWidth;
    let height = srcHeight;

    if (width > height) {
      height = (height / width) * size;
      width = size;
    } else {
      width = (width / height) * size;
      height = size;
    }

    try {
      const storageFileRef = storageRef(storageBucketRef.value, `${uuid()}_${file.name}`);
      const uploadTask = await uploadBytes(storageFileRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      emit('select', {
        tag: PartTag.Image,
        width,
        height,
        src: url,
        srcWidth,
        srcHeight,
      });
    } catch (error) {
      console.error(error);
    }

    // studio.setPhotoUploading(false);
  };

  // input.oncancel = () => {
  //   studio.usePointer();
  // };
  input.click();
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
</script>
