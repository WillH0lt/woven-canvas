import type { Product, Subscription } from '@invertase/firestore-stripe-payments';
import {
  createCheckoutSession,
  getCurrentUserSubscriptions,
  getProducts,
} from '@invertase/firestore-stripe-payments';
import { usePayments } from '~/composables/usePayments';

export const usePlanStore = defineStore('plan', () => {
  const siteStore = useSiteStore();
  const payments = usePayments();
  const functions = useFunctions();
  const requestUrl = useRequestURL();

  const subscriptions = ref<Subscription[]>([]);
  const products = ref<Product[]>([]);

  const activeSubscription = computed(() =>
    subscriptions.value.find(
      (subscription) =>
        subscription.status === 'active' && subscription.metadata.siteId === siteStore.site?.id,
    ),
  );

  const partLimit = computed(() => (activeSubscription.value ? 1e6 : 50));

  const pageLimit = computed(() => (activeSubscription.value ? 1e6 : 3));

  async function loadSubscriptions(): Promise<void> {
    subscriptions.value = await getCurrentUserSubscriptions(payments, {
      status: 'active',
    });
  }

  async function loadProducts(): Promise<void> {
    if (products.value.length > 0) return;

    products.value = await getProducts(payments, {
      includePrices: true,
      activeOnly: true,
    });
  }

  async function goToSubscribe(siteId: string, priceId: string): Promise<void> {
    const session = await createCheckoutSession(payments, {
      price: priceId,
      allow_promotion_codes: true,
      metadata: {
        siteId,
      },
    });
    window.location.assign(session.url);
  }

  async function goToCancelSubscription(subscription: Subscription): Promise<void> {
    interface CreatePortalResult {
      url: string;
    }

    const { data } = (await functions.createPortalLink({
      returnUrl: requestUrl.href,
      flow_data: {
        type: 'subscription_cancel',
        subscription_cancel: {
          subscription: subscription.id,
        },
      },
    })) as { data: CreatePortalResult };

    window.location.assign(data.url);
  }

  async function goToManageSubscription(subscription: Subscription): Promise<void> {
    interface CreatePortalResult {
      url: string;
    }

    const { data } = (await functions.createPortalLink({
      returnUrl: requestUrl.href,
      flow_data: {
        type: 'subscription_update',
        subscription_update: {
          subscription: subscription.id,
        },
      },
    })) as { data: CreatePortalResult };

    window.location.assign(data.url);
  }

  return {
    products,
    activeSubscription,
    partLimit,
    pageLimit,
    loadSubscriptions,
    loadProducts,
    goToSubscribe,
    goToCancelSubscription,
    goToManageSubscription,
  };
});
