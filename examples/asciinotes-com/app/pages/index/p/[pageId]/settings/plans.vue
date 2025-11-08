<template>
  <div class="flex flex-col gap-8 mt-32 pb-32">
    <ElementSection title="Plans">
      <div class="flex flex-col lg:flex-row gap-8">
        <PlanCard
          class="opacity-70 bg-gray-200"
          name="Free"
          checkColor="var(--color-gray-400)"
          :isFree="true"
          :features="freeFeatures"
        ></PlanCard>
        <PlanCard
          class="flex-1 bg-primary-light"
          name="Premium"
          v-model:is-yearly="isYearly"
          :default-price="8"
          :monthlyPrice="monthlyPrice"
          :yearlyPrice="yearlyPrice"
          :features="premiumFeatures"
        ></PlanCard>
      </div>
    </ElementSection>
  </div>
</template>

<script setup lang="ts">
const planStore = usePlanStore();

const freeFeatures = ['3 Pages', '50 Elements / Page', 'ScrollyPage Domain'];

const premiumFeatures = [
  'Unlimited Pages',
  'Unlimited Elements',
  'Remove ScrollyPage Branding',
  'Use Custom Domain',
  'Priority Support',
];

const isYearly = ref(true);

const monthlyPrice = computed(
  () => planStore.products.find((product) => product.name === 'Premium Monthly')?.prices[0],
);

const yearlyPrice = computed(
  () => planStore.products.find((product) => product.name === 'Premium Yearly')?.prices[0],
);

onMounted(async () => {
  await planStore.loadProducts();
});
</script>
