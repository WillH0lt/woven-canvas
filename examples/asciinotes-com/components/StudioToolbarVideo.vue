<template>
  <img
    class="cursor-pointer ml-4 mr-2 translate-y-7 hover:translate-y-0 transition-transform duration-200"
    :src="`/img/polaroid.${hovered ? 'webp' : 'png'}`"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="handleUploadPressed"
  />
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
  input.accept = 'video/*';
  input.onchange = async function () {
    if (!input.files) return;

    const file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
      appStore.notify('File size is too large. Max size is 10MB.');
      return;
    }

    let { width, height } = await getVideoDimensions(file);

    const size = 400;

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
        tag: PartTag.Video,
        width,
        height,
        src: url,
      });
    } catch (error) {
      console.error(error);
    }
  };
  input.click();
}

async function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // Create a video element to load the file
    const videoElement = document.createElement('video');

    // Set up event listeners
    videoElement.addEventListener('loadedmetadata', () => {
      // Resolve with the video's intrinsic width and height
      resolve({
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
    });

    // Handle potential errors
    videoElement.addEventListener('error', (error) => {
      reject(new Error(`Error loading video: ${error}`));
    });

    // Set the source to the uploaded file
    videoElement.src = URL.createObjectURL(file);

    // Trigger loading of the video metadata
    videoElement.load();
  });
}
</script>
