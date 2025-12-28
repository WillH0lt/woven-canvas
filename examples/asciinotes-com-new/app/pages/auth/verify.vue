<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-6">
      <div class="text-center">
        <!-- Loading state -->
        <div v-if="isVerifying" class="space-y-4">
          <ElementLoadingSpinner class="mx-auto text-gray-600" size="xl" />
          <h2 class="text-2xl font-bold text-gray-900">Signing you in...</h2>
          <p class="text-gray-600">
            Please wait while we verify your email link.
          </p>
        </div>

        <!-- Email input state -->
        <div v-else-if="needsEmail" class="space-y-4">
          <h2 class="">Enter your email to continue</h2>
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

            <UButton class="cursor-pointer" type="submit" block>
              Continue
            </UButton>
          </UForm>
        </div>

        <!-- Success state -->
        <div v-else-if="isSuccess" class="space-y-4">
          <div
            class="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold">Welcome to AsciiNotes!</h2>
          <p class="text-gray-600">You've been successfully signed in.</p>
          <p class="text-gray-600">Redirecting...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="errorMessage" class="space-y-4">
          <div
            class="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold">Sign-in failed</h2>
          <p class="text-error">{{ errorMessage }}</p>
          <div class="space-y-2">
            <UButton @click="tryAgain" variant="solid" color="primary" block>
              Try signing in again
            </UButton>
            <UButton @click="goHome" variant="outline" color="neutral" block>
              Go to homepage
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

import { AuthErrorText } from "~/constants";

const { signUpWithMagicLink, isValidMagicLink, getStoredEmail } =
  useEmailAuth();
const router = useRouter();

const isVerifying = ref(true);
const needsEmail = ref(false);
const isSuccess = ref(false);
const errorMessage = ref("");

const schema = z.object({
  email: z.email("Please enter a valid email address"),
});

type Schema = z.infer<typeof schema>;

const state = reactive({
  email: "",
});

async function verifyEmailLink(inputEmail?: string) {
  try {
    const url = window.location.href;

    const email = inputEmail ?? getStoredEmail();
    if (!email) {
      // No stored email, prompt user to enter it
      needsEmail.value = true;
      isVerifying.value = false;
      return;
    }

    // Check if this is a valid sign-in link
    if (!isValidMagicLink(url)) {
      throw new Error("Invalid sign-in link");
    }

    // Sign in the user with the email link
    await signUpWithMagicLink(url, email);

    // Show success state
    isVerifying.value = false;
    isSuccess.value = true;

    // Redirect to dashboard or home after a short delay
    setTimeout(() => {
      router.replace("/");
    }, 2000);
  } catch (error: any) {
    console.error("Email link verification failed:", error);

    isVerifying.value = false;
    errorMessage.value =
      error.code in AuthErrorText
        ? AuthErrorText[error.code as keyof typeof AuthErrorText]
        : error.message ||
          "An error occurred during sign-in. Please try again.";
  }
}

function continueWithEmail(event: FormSubmitEvent<Schema>) {
  isVerifying.value = true;
  needsEmail.value = false;

  verifyEmailLink(event.data.email);
}

function tryAgain() {
  router.replace("/");
}

function goHome() {
  router.replace("/");
}

const auth = useFirebaseAuth()!;

onMounted(() => {
  // wait for anonymous user to be set up
  auth.onAuthStateChanged((user) => {
    if (user) {
      verifyEmailLink();
    }
  });
});
</script>
