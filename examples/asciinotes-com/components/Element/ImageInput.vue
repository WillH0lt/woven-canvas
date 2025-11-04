<template>
  <div class="flex items-center">
    <div>
      <div class="text-sm font-bold">{{ title }}</div>
      <div class="text-xs text-gray-500">{{ width }} x {{ height }} pixels</div>
      <ElementButton
        v-if="imageUrl === ''"
        class="w-20 h-7 mt-2 !bg-gray-500 hover:!bg-primary"
        @click="handleUploadPressed"
        :loading="uploading"
      >
        Upload
      </ElementButton>
      <ElementButton
        v-else
        class="w-20 h-7 mt-2 !bg-gray-500 hover:!bg-primary"
        @click="imageUrl = ''"
      >
        Remove
      </ElementButton>
    </div>

    <div
      class="flex items-center justify-center bg-gray-200 w-1/2 aspect-[120/63] rounded-lg ml-auto"
      ref="dropZoneRef"
      :class="{
        'border-4 border-dashed border-primary': isOverDropZone && !uploading && imageUrl === '',
      }"
      @click="handleUploadPressed"
    >
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt="Uploaded Image"
        class="object-contain w-full h-full rounded-lg"
        :style="{
          'image-rendering': width <= 64 ? 'pixelated' : 'auto',
        }"
      />
      <div v-else class="text-gray-500">Drop Image</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFirebaseStorage } from 'vuefire';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { v4 as uuid } from 'uuid';

const dropZoneRef = ref<HTMLDivElement>();

const props = defineProps<{
  title: string;
  width: number;
  height: number;
  uploadPath: string;
}>();

const imageUrl = defineModel<string>({ required: true });

const error = ref<string | null>(null);
const uploading = ref(false);
const storage = useFirebaseStorage();
const storageBucket = storageRef(storage, props.uploadPath);

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop,
  dataTypes: ['image/png', 'image/jpeg'],
  multiple: false,
  preventDefaultForUnhandled: true,
});

async function onDrop(files: File[] | null): Promise<void> {
  if (!files || files.length === 0) return;

  const file = files[0];

  await upload(file);
}

async function handleUploadPressed() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg, image/jpg';
  input.onchange = async function () {
    if (!input.files) return;
    const file = input.files[0];

    await upload(file);
  };

  input.click();
}

async function upload(file: File) {
  const blob = await resizeImage(file, props.width, props.height);

  uploading.value = true;

  try {
    const storageFileRef = storageRef(storageBucket, `${uuid()}.png`);
    const uploadTask = await uploadBytes(storageFileRef, blob);
    imageUrl.value = await getDownloadURL(uploadTask.ref);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An error occurred';
    error.value = errorMsg;
  } finally {
    uploading.value = false;
  }
}

function resizeImage(file: File, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas');

  const image = new Image();
  image.src = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    image.onload = () => {
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject('Failed to create blob');
        resolve(blob);
      }, 'image/png');

      URL.revokeObjectURL(image.src);
    };
  });
}
</script>
