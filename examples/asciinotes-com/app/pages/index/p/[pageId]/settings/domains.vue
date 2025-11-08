<template>
  <div class="flex flex-col gap-8 mt-32 pb-32">
    <ElementSection v-if="site.domain" title="Custom Domain">
      <div class="flex items-center gap-8 my-8 text-lg px-2">
        <div>Domain</div>
        <a :href="'https://' + site.domain" target="_blank" class="text-primary">
          {{ site.domain }}
        </a>

        <ElementDropdown
          :menuItems="[
            {
              text: 'Remove Domain',
              loading: removingDomain,
              onClick: removeDomain,
            },
          ]"
        >
          <SvgoEllipsis />
        </ElementDropdown>
      </div>

      <div class="font-bold px-4 text-sm">
        Set up your DNS records using the following values. The SSL certificate might take up to 10
        minutes to become active.
      </div>

      <div>
        <div class="grid grid-cols-3 bg-gray-200 py-3 justify-evenly text-center rounded-t-lg">
          <div>Name</div>
          <div>Type</div>
          <div>Value</div>
        </div>
        <div class="grid grid-cols-3 bg-white py-3 border-gray-200 border-t-0 border-2 text-center">
          <div>@</div>
          <div>A</div>
          <div>34.8.208.114</div>
        </div>
        <div
          class="grid grid-cols-3 bg-white py-3 border-gray-200 border-t-0 border-2 text-center rounded-b-lg"
        >
          <div>www</div>
          <div>A</div>
          <div>34.8.208.114</div>
        </div>
      </div>
      <div v-if="removingDomainError" class="text-error text-sm mt-4">
        {{ removingDomainError }}
      </div>
    </ElementSection>
    <ElementSection v-else title="Domains">
      <div class="flex gap-8 items-start">
        <ElementRadioButton class="mt-4" v-model="domainKind" :value="DomainKind.Subdomain" />
        <ElementInput
          class="w-full"
          title="Use a scrolly.page domain"
          placeholder="my-awesome-site"
          :maxlength="64"
          v-model="slug"
          :disabled="domainKind !== DomainKind.Subdomain"
          @blur="checkSlug"
          @input="saveError = null"
          :error="slugError"
          suffix=".scrolly.page"
          :lowercase="true"
          tip="Please only use numbers, letters, and hyphens."
        />
      </div>

      <div class="flex gap-8 items-start">
        <ElementRadioButton
          class="mt-4"
          v-model="domainKind"
          :value="DomainKind.Custom"
          :disabled="!planStore.activeSubscription"
        />
        <ElementInput
          class="w-full"
          title="Connect your own domain"
          :titlePremium="true"
          placeholder="my-awesome-site.com"
          :maxlength="255"
          v-model="domain"
          :disabled="domainKind !== DomainKind.Custom"
          @blur="checkDomain"
          @input="saveError = null"
          :error="domainError"
          :lowercase="true"
        />
      </div>
    </ElementSection>
  </div>

  <Transition name="pop">
    <ElementSaveBanner
      ref="elementSaveBannerRef"
      v-if="isChanged || saveError"
      :canSave="canSave"
      :error="saveError"
      :saving="saving"
      @reset="reset"
      @save="save"
    />
  </Transition>
</template>

<script setup lang="ts">
import type { Site } from '@prisma/client';

import ElementSaveBanner from '~/components/Element/SaveBanner.vue';
import ElementSection from '~/components/Element/Section.vue';
import { shakeElement } from '~/utils';

enum DomainKind {
  Subdomain = 'subdomain',
  Custom = 'custom',
}

const { $client } = useNuxtApp();
const planStore = usePlanStore();
const siteStore = useSiteStore();
const site = computed(() => siteStore.site!);

const elementSaveBannerRef = ref<InstanceType<typeof ElementSaveBanner> | null>(null);
const domainKind = ref<DomainKind>(site.value.domain ? DomainKind.Custom : DomainKind.Subdomain);

const slug = ref<string>(site.value.slug);
const domain = ref<string | null>(site.value.domain);

const slugError = ref<string | null>(null);
const domainError = ref<string | null>(null);
const saveError = ref<string | null>(null);

const isChanged = computed(() => {
  return domain.value !== site.value.domain || slug.value !== site.value.slug;
});

const canSave = computed(() => {
  return !slugError.value && !domainError.value && isChanged.value;
});

watchEffect(() => {
  slug.value = site.value.slug;
  domain.value = site.value.domain;
});

watch(domainKind, () => {
  if (domainKind.value === DomainKind.Subdomain) {
    domain.value = null;
  } else {
    slug.value = site.value.slug;
    slugError.value = null;
  }
});

function reset() {
  slug.value = site.value.slug;
  domain.value = site.value.domain;
  slugError.value = null;
  domainError.value = null;
  saveError.value = null;
  domainKind.value = site.value.domain ? DomainKind.Custom : DomainKind.Subdomain;
}

async function checkSlug() {
  slug.value = slug.value.toLowerCase().trim();

  if (slug.value.length < 3) {
    slugError.value = 'Please use at least 3 characters.';
    return;
  }

  if (!/^[a-z0-9-]+$/.test(slug.value)) {
    slugError.value = 'Please only use numbers, letters, and hyphens.';
    return;
  }

  const isUnique = await $client.site.slugIsUnique.query({
    slug: slug.value,
    siteId: site.value.id,
  });
  if (!isUnique) {
    slugError.value = 'Sorry, this one is already taken.';
  } else {
    slugError.value = null;
  }
}

async function checkDomain() {
  if (!domain.value) {
    domainError.value = 'Please enter a domain.';
    return;
  }

  domain.value = domain.value.toLowerCase().trim();
  domain.value = domain.value.split('://').pop()!;

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domain.value)) {
    domainError.value = 'Please enter a valid domain.';
    return;
  }

  domainError.value = null;
}

const saving = ref(false);
async function save() {
  if (saving.value || !canSave.value) {
    return;
  }

  saving.value = true;

  try {
    let updates: Partial<Site> = {};
    if (slug.value) updates.slug = slug.value;
    if (domain.value) updates.domain = domain.value;

    await siteStore.updateSite(updates);
  } catch (error: unknown) {
    if (error instanceof Error) {
      saveError.value = error.message;
    } else {
      saveError.value = 'Something went wrong.';
    }
  } finally {
    saving.value = false;
  }
}

const removingDomain = ref(false);
const removingDomainError = ref<string | null>(null);
async function removeDomain() {
  removingDomainError.value = null;

  if (removingDomain.value) {
    return;
  }

  removingDomain.value = true;

  try {
    await siteStore.updateSite({
      domain: null,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      removingDomainError.value = error.message;
    } else {
      removingDomainError.value = 'Something went wrong.';
    }
  } finally {
    removingDomain.value = false;
  }
}

onBeforeRouteLeave(async (to, from, next) => {
  if (isChanged.value) {
    elementSaveBannerRef.value?.highlight();
    shakeElement('siteSettings');
    next(false);
  } else {
    next();
  }
});
</script>
