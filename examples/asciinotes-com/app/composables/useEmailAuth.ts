import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

export const useEmailAuth = () => {
  const auth = useFirebaseAuth()!;

  const sendMagicLink = async (
    email: string,
    redirectUrl: string = "/auth/verify"
  ) => {
    // Store email in localStorage for later verification
    localStorage.setItem("emailForSignIn", email);

    const actionCodeSettings = {
      url: `${window.location.origin}${redirectUrl}`,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  };

  const verifyMagicLink = async (url: string, email?: string) => {
    if (!isSignInWithEmailLink(auth, url)) {
      throw new Error("Invalid sign-in link");
    }

    let userEmail = email || localStorage.getItem("emailForSignIn");

    if (!userEmail) {
      throw new Error("Email is required to complete sign-in");
    }

    const result = await signInWithEmailLink(auth, userEmail, url);

    // Clear email from localStorage
    localStorage.removeItem("emailForSignIn");

    return result;
  };

  const isValidMagicLink = (url: string) => {
    return isSignInWithEmailLink(auth, url);
  };

  const getStoredEmail = () => {
    return localStorage.getItem("emailForSignIn");
  };

  const clearStoredEmail = () => {
    localStorage.removeItem("emailForSignIn");
  };

  return {
    sendMagicLink,
    verifyMagicLink,
    isValidMagicLink,
    getStoredEmail,
    clearStoredEmail,
  };
};
