<template>
  <div class="rounded shadow p-8">
    <div class="flex items-center gap-4">
      <div class="text-2xl">{{ name }}</div>
      <div class="flex items-center gap-4 ml-auto" v-if="!isFree">
        <div class="text-gray-500">Yearly</div>
        <ElementToggle v-model="isYearly" />
      </div>
    </div>
    <div class="text-3xl font-bold ml-4">{{ priceText }}</div>
    <div
      class="text-gray-500 mb-8"
      :class="{
        'opacity-0': isFree,
      }"
    >
      per month, billed {{ periodText }}
    </div>
    <div class="flex items-center gap-4 h-8" v-for="feature in features">
      <SvgoCheck
        class="w-6 h-6"
        :style="{
          color: checkColor,
        }"
      />
      <div class="">{{ feature }}</div>
    </div>
    <div class="flex justify-center" v-if="!isFree">
      <ElementButton
        class="w-40 mt-8 h-12"
        v-if="planStore.activeSubscription"
        :loading="goingToManage"
        @click="goToManage()"
      >
        Manage
      </ElementButton>
      <ElementButton class="w-40 mt-8 h-12" v-else :loading="subscribing" @click="goToSubscribe()">
        Subscribe
      </ElementButton>
    </div>
    <div class="flex justify-center mt-4 h-8" v-if="planStore.activeSubscription && !isFree">
      <div class="text-gray-500" v-if="cancellationDate">
        Plan is set to cancel on
        {{ cancellationDate }}
      </div>

      <div
        class="relative text-primary hover:underline cursor-pointer"
        v-else
        @click="() => goToCancel()"
      >
        <ElementLoadingIcon class="absolute inset-1/2 scale-[40%]" v-if="goingToCancel" />
        <div v-else>Cancel Subscription</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Price } from '@invertase/firestore-stripe-payments';

interface Props {
  name: string;
  features: string[];
  defaultPrice?: number;
  isFree?: boolean;
  checkColor?: string;
  monthlyPrice?: Price;
  yearlyPrice?: Price;
}

const props = withDefaults(defineProps<Props>(), {
  defaultPrice: 0,
  checkColor: 'var(--color-primary)',
  isFree: false,
});

const isYearly = defineModel<boolean>('isYearly', { default: true });

const planStore = usePlanStore();
const siteStore = useSiteStore();

const cancellationDate = computed(() => {
  // console.log(planStore.activeSubscription.cancel_at);
  return planStore.activeSubscription?.cancel_at
    ? useDateFormat(planStore.activeSubscription.cancel_at, 'MMM Do, YYYY')
    : null;
});

const priceText = computed(() => {
  if (!props.monthlyPrice || !props.yearlyPrice) {
    return `$${props.defaultPrice}`;
  }

  if (isYearly.value) {
    return `$${(props.yearlyPrice.unit_amount || 0) / 1200}`;
  }
  return `$${(props.monthlyPrice.unit_amount || 0) / 100}`;
});

const periodText = computed(() => (isYearly.value ? 'yearly' : 'monthly'));

const subscribing = ref(false);
async function goToSubscribe(): Promise<void> {
  const siteId = siteStore.site?.id;
  if (!siteId) return;

  const priceId = isYearly.value ? props.yearlyPrice?.id : props.monthlyPrice?.id;
  if (!priceId) return;

  subscribing.value = true;

  try {
    await planStore.goToSubscribe(siteId, priceId);
  } catch (error) {
    console.error(error);
    subscribing.value = false;
  }
}

const goingToManage = ref(false);
async function goToManage(): Promise<void> {
  if (!planStore.activeSubscription) return;

  goingToManage.value = true;

  try {
    await planStore.goToManageSubscription(planStore.activeSubscription);
  } catch (error) {
    console.error(error);
    goingToManage.value = false;
  }
}

const goingToCancel = ref(false);
async function goToCancel(): Promise<void> {
  if (!planStore.activeSubscription) return;

  goingToCancel.value = true;

  try {
    await planStore.goToCancelSubscription(planStore.activeSubscription);
  } catch (error) {
    console.error(error);
    goingToCancel.value = false;
  }
}
</script>
