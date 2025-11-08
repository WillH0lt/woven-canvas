import { collection, doc } from 'firebase/firestore';

import type { Profile } from '../types/index.js';

export const useProfileStore = defineStore('profile', () => {
  const db = useFirestore();
  const currentUser = useCurrentUser();
  const userDocRef = computed(
    () => currentUser.value && doc(collection(db, 'users'), currentUser.value.uid),
  );
  const profile = useDocument<Profile>(userDocRef);

  return {
    profile,
  };
});
