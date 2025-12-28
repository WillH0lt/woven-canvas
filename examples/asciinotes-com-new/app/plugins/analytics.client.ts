import type { Analytics } from 'firebase/analytics';
import { initializeAnalytics, isSupported } from 'firebase/analytics';

export default defineNuxtPlugin(async () => {
  const firebaseApp = useFirebaseApp();

  let analytics: Analytics | null = null;
  if (await isSupported()) {
    analytics = initializeAnalytics(firebaseApp);
  } else {
    console.log('Analytics not supported');
  }

  return {
    provide: {
      analytics,
    },
  };
});
