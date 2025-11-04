import Stripe from 'stripe';

function stripeSingleton(): Stripe {
  const runtimeConfig = useRuntimeConfig();
  return new Stripe(runtimeConfig.stripeSecretKey);
}

declare const globalThis: {
  stripe: Stripe;
} & typeof global;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const stripe = globalThis.stripe ?? stripeSingleton();

export { stripe };

// if (process.env.NODE_ENV !== 'production') globalThis.stripe = stripe;
globalThis.stripe = stripe;
