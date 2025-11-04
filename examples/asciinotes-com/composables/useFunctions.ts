import type { HttpsCallable } from 'firebase/functions';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const useFunctions = (): { createPortalLink: HttpsCallable } => {
  const app = useFirebaseApp();
  const functions = getFunctions(app);
  const createPortalLink = httpsCallable(
    functions,
    'ext-firestore-stripe-payments-createPortalLink',
  );
  return {
    createPortalLink,
  };
};
