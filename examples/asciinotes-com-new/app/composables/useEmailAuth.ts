import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export const useEmailAuth = () => {
  const auth = useFirebaseAuth()!;

  async function sendMagicLink(
    email: string,
    redirectUrl: string = "/auth/verify"
  ) {
    // Store email in localStorage for later verification
    localStorage.setItem("emailForSignIn", email);

    const actionCodeSettings = {
      url: `${window.location.origin}${redirectUrl}`,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  }

  async function signUpWithMagicLink(url: string, email?: string) {
    if (!isSignInWithEmailLink(auth, url)) {
      throw new Error("Invalid sign-in link");
    }

    let userEmail = email || localStorage.getItem("emailForSignIn");

    if (!userEmail) {
      throw new Error("Email is required to complete sign-in");
    }

    if (!auth.currentUser) {
      throw new Error(
        "There must be an anonymous user to sign up with a provider."
      );
    }

    const credential = EmailAuthProvider.credentialWithLink(userEmail, url);

    try {
      return await linkWithCredential(auth.currentUser, credential);
    } catch (err: any) {
      console.log("Error linking credential:", err);
      if (err.code === "auth/email-already-in-use") {
        // TODO authorize transfer of anonymous data to existing account

        // If the credential is already in use, sign in with the link instead
        return await signInWithEmailLink(auth, userEmail, url);
      }

      throw err;
    }
  }

  function isValidMagicLink(url: string) {
    return isSignInWithEmailLink(auth, url);
  }

  function getStoredEmail() {
    return localStorage.getItem("emailForSignIn");
  }

  function clearStoredEmail() {
    localStorage.removeItem("emailForSignIn");
  }

  return {
    sendMagicLink,
    signUpWithMagicLink,
    isValidMagicLink,
    getStoredEmail,
    clearStoredEmail,
  };
};
