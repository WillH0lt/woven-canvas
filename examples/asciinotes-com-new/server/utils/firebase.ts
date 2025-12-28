import type { App } from 'firebase-admin/app';
import { initializeApp } from 'firebase-admin/app';

function appSingleton(): App {
  const runtimeConfig = useRuntimeConfig();
  return initializeApp(runtimeConfig.public.vuefire.config);
}

declare const globalThis: {
  firebaseApp: App;
} & typeof global;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const firebaseApp = globalThis.firebaseApp ?? appSingleton();

export { firebaseApp };

// if (process.env.NODE_ENV !== 'production') globalThis.firebaseApp = firebaseApp;
globalThis.firebaseApp = firebaseApp;
