<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20"
    @click="$emit('close')"
    :style="{
      fontSize: '16px',
    }"
  >
    <div
      class="relative w-full max-w-[420px] pt-[64px] pb-[16px] bg-gray-300 flex flex-col items-center gap-[16px] rounded-lg"
      :class="{
        'pb-[64px]': !signingUp && errorMessage === '',
      }"
      @click.stop
    >
      <svgoX
        class="absolute top-[16px] right-[16px] w-[16px] text-primary hover:scale-110 transition cursor-pointer"
        @click="$emit('close')"
      />

      <UButton
        class="relative w-[320px] bg-white drop-shadow text-black"
        @click="signinGoogleRedirect"
      >
        Continue with Google
      </UButton>

      <!-- <ElementButton
        class="relative w-[320px] bg-white drop-shadow"
        @click="signinGoogleRedirect"
      >
        <svgoGoogle class="mx-[16px] w-[16px]" />
        <div class="text-black">Continue with Google</div>
      </ElementButton>

      <ElementButton
        class="relative w-[320px] bg-white drop-shadow"
        @click="signinMicrosoftRedirect"
      >
        <SvgoMicrosoft class="absolute left-0 mx-[16px] w-[16px]" />
        <div class="text-black">Continue with Microsoft</div>
      </ElementButton>

      <ElementButton
        class="relative w-[320px] bg-white drop-shadow"
        @click="signinGithubRedirect"
      >
        <SvgoGithub class="absolute left-0 mx-[16px] w-[16px]" />
        <div class="text-black">Continue with Github</div>
      </ElementButton> -->

      <div v-if="errorMessage" class="w-[320px] text-error">
        * {{ errorMessage }}
      </div>

      <div class="w-[320px] text-gray-500 text-center" v-if="signingUp">
        By registering you agree to ScrollyPage's
        <a
          class="text-primary hover:underline"
          href="https://scrolly.page/terms"
          target="_blank"
          >Terms of Service</a
        >
        and
        <a
          class="text-primary hover:underline"
          href="https://scrolly.page/privacy"
          target="_blank"
          >Privacy Policy</a
        >
        .
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import type { UserCredential } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";

import type { Profile } from "~/types/index.js";

// defineProps<{
//   signingUp: boolean;
// }>();

const AuthErrorText = {
  "auth/wrong-password": "the password is incorrect.",
  "auth/invalid-login-credentials": "the email or password is incorrect.",
  "auth/user-disabled":
    "The user account has been disabled by an administrator.",
  "auth/weak-password": "The password is not strong enough.",
  "auth/email-already-in-use":
    "the email address is already being used by another account.",
  "auth/missing-email": "Please enter an email address.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-not-found": "There is no account registered with this email.",
  "auth/too-many-requests": "Too many requests. Please try again later.",
  "auth/operation-not-allowed": "An error occurred. Please try again.",
  "auth/invalid-action-code": "The link is invalid or has expired.",
  "auth/internal-error": "An error occurred. Please try again.",
  "auth/expired-action-code": "The link is invalid or has expired.",
  "auth/recent-login-required": "Please log in again and retry.",
  "auth/provider-already-linked":
    "The account is already linked to an existing account.",
  "auth/invalid-phone-number": "Please enter a valid phone number.",
  "auth/requires-recent-login":
    "This requires a recent log in, please log in again and retry.",
  "auth/account-exists-with-different-credential":
    "An account already exists with the same email address but different sign-in provider.",
};

const auth = useFirebaseAuth()!;
const db = useFirestore();
const router = useRouter();

const googleAuthProvider = new GoogleAuthProvider();
const githubAuthProvider = new GithubAuthProvider();
const microsoftAuthProvider = new OAuthProvider("microsoft.com");
microsoftAuthProvider.setCustomParameters({
  prompt: "login",
  tenant: "common",
});

const emit = defineEmits(["close"]);

const errorMessage = ref("");

async function signinGoogleRedirect() {
  console.log("Signing in with Google");
  errorMessage.value = "";
  try {
    const credential = await signInWithPopup(auth, googleAuthProvider);

    await grabProfileData(credential);
    router.replace("/");
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err;
  }
}

async function signinMicrosoftRedirect() {
  errorMessage.value = "";
  try {
    const credential = await signInWithPopup(auth, microsoftAuthProvider);
    await grabProfileData(credential);
    router.replace("/");
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err;
  }
}

async function signinGithubRedirect() {
  errorMessage.value = "";
  try {
    const credential = await signInWithPopup(auth, githubAuthProvider);
    await grabProfileData(credential);
    router.replace("/");
  } catch (err: any) {
    console.error(err);
    errorMessage.value =
      err.code in AuthErrorText
        ? AuthErrorText[err.code as keyof typeof AuthErrorText]
        : err;
  }
}

async function grabProfileData(credential: UserCredential): Promise<void> {
  const user = credential.user;

  const documentRef = doc(collection(db, "users"), user.uid);

  const profile: Partial<Profile> = {
    uid: user.uid,
  };

  if (user.email) {
    profile.email = user.email;
  }

  if (user.photoURL) {
    profile.photoUrl = user.photoURL;
  }

  await setDoc(documentRef, profile, { merge: true });
}
</script>
