import type { StripePayments } from '@invertase/firestore-stripe-payments';
import { getStripePayments } from '@invertase/firestore-stripe-payments';

export const usePayments = (): StripePayments => {
  const app = useFirebaseApp();
  return getStripePayments(app, {
    productsCollection: 'products',
    customersCollection: 'customers',
  });
};
