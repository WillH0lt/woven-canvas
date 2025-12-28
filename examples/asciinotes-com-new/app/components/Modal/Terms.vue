<template>
  <UModal class="divide-y-0 max-w-md" :dismissible="false" :close="false">
    <template #body>
      <div class="flex flex-col w-full items-center gap-4">
        <div class="font-bold">Legal consent</div>
        <div class="text-xs text-gray-500 px-4 text-center">
          Please read and accept the terms to continue
        </div>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4 w-full px-12 mt-4"
          @submit="submit"
        >
          <UFormField
            name="acceptedTerms"
            :ui="{
              error: 'text-xs ml-2',
            }"
          >
            <UCheckbox v-model="state.acceptedTerms">
              <template #label>
                <div class="text-xs">
                  I agree to the
                  <a href="/terms" target="_blank" class="link"
                    >Terms of Service</a
                  >
                  and
                  <a href="/privacy" target="_blank" class="link"
                    >Privacy Policy</a
                  >
                </div>
              </template>
              ></UCheckbox
            >
          </UFormField>

          <UButton
            class="cursor-pointer mt-4"
            type="submit"
            block
            :loading="isLoading"
          >
            Continue
          </UButton>
        </UForm>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from "@nuxt/ui";
import z from "zod";

import { AuthErrorText } from "~/constants";

const emit = defineEmits(["close"]);

const isLoading = ref(false);
const errorMessage = ref("");
const appStore = useAppStore();

const schema = z.object({
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "Please accept the terms to continue",
  }),
});

type Schema = z.infer<typeof schema>;

const state = reactive({
  acceptedTerms: false,
});

async function submit(event: FormSubmitEvent<Schema>) {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await appStore.acceptTerms();
    emit("close");
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err.message || "An error occurred. Please try again.";
  } finally {
    isLoading.value = false;
  }
}
</script>
