<template>
  <UModal :close="{ onClick: () => emit('close') }" class="divide-y-0 w-xs">
    <template #body>
      <!-- Email sent success state -->
      <div
        v-if="emailSent"
        class="flex flex-col w-full items-center gap-4 text-center"
      >
        <div class="font-bold">Check your email</div>
        <div class="text-sm text-gray-600 px-4">
          We've sent an email to
          <span class="font-medium">{{ state.email }}</span
          >. Click the link in your email to sign in to AsciiNotes.
        </div>
        <div class="text-xs text-gray-500 px-4">
          Didn't receive the email? Check your spam folder or
          <button @click="resendEmail" class="text-blue-600 hover:underline">
            try again</button
          >.
        </div>
        <UButton variant="outline" color="neutral" @click="goBack" class="mt-2">
          Back to sign in
        </UButton>
      </div>

      <!-- Default sign in state -->
      <div v-else class="flex flex-col w-full items-center gap-4">
        <div class="font-bold">Continue to AsciiNotes</div>
        <UButton
          class="cursor-pointer"
          @click="continueWithGoogle"
          :leadingIcon="IconGoogle"
          variant="outline"
          color="neutral"
          block
        >
          Continue with Google
        </UButton>

        <UButton
          class="cursor-pointer"
          @click="continueWithGithub"
          :leadingIcon="IconGithub"
          variant="outline"
          color="neutral"
          block
        >
          Continue with Github
        </UButton>
        <div
          class="flex items-center justify-center w-full gap-2 px-2 text-sm text-gray-400"
        >
          ---------- or ----------
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4 w-full"
          @submit="continueWithEmail"
        >
          <UFormField
            name="email"
            :ui="{
              error: 'text-xs ml-2',
            }"
          >
            <UInput
              class="w-full"
              v-model="state.email"
              placeholder="Enter your email address"
            />
          </UFormField>

          <UButton
            class="cursor-pointer"
            type="submit"
            block
            :loading="isLoading"
            :disabled="isLoading"
          >
            {{ isLoading ? "Sending..." : "Continue" }}
          </UButton>
        </UForm>
      </div>
      <div
        v-if="errorMessage"
        class="w-full text-center text-sm mt-2 text-error"
      >
        * {{ errorMessage }}
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import type { FormSubmitEvent } from "@nuxt/ui";
import z from "zod";
import { IconGoogle, IconGithub } from "#components";

import { AuthErrorText } from "~/constants";

const auth = useFirebaseAuth()!;
const { sendMagicLink } = useEmailAuth();

const googleAuthProvider = new GoogleAuthProvider();
const githubAuthProvider = new GithubAuthProvider();

const emit = defineEmits(["close"]);

const errorMessage = ref("");
const emailSent = ref(false);
const isLoading = ref(false);

async function continueWithGoogle() {
  errorMessage.value = "";
  try {
    await signInWithPopup(auth, googleAuthProvider);
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err;
  }
}

async function continueWithGithub() {
  errorMessage.value = "";
  try {
    await signInWithPopup(auth, githubAuthProvider);
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err;
  }
}

const schema = z.object({
  email: z.email("Please enter a valid email address"),
});

type Schema = z.infer<typeof schema>;

const state = reactive({
  email: "",
});

async function continueWithEmail(event: FormSubmitEvent<Schema>) {
  errorMessage.value = "";
  isLoading.value = true;

  try {
    await sendMagicLink(state.email);
    emailSent.value = true;
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

async function resendEmail() {
  if (!state.email) return;

  errorMessage.value = "";
  isLoading.value = true;

  try {
    await sendMagicLink(state.email);
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

function goBack() {
  emailSent.value = false;
  errorMessage.value = "";
}
</script>
