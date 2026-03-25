<script setup lang="ts">
import { computed } from 'vue'
import { Embed, EmbedProvider } from '@woven-canvas/core'

import type { BlockData } from '../../types'
import { useComponent } from '../../composables/useComponent'

const props = defineProps<BlockData>()

const embed = useComponent(props.entityId, Embed)

const iframeSrc = computed(() => {
  if (!embed.value) return null
  return embed.value.embedUrl || embed.value.url || null
})

const iframeAllow = computed(() => {
  if (!embed.value) return ''
  switch (embed.value.provider) {
    case EmbedProvider.Youtube:
      return 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    case EmbedProvider.Spotify:
      return 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
    case EmbedProvider.GoogleMaps:
      return 'fullscreen'
    case EmbedProvider.GoogleCalendar:
      return 'fullscreen'
    case EmbedProvider.GoogleSlides:
      return 'fullscreen'
    case EmbedProvider.Figma:
      return 'fullscreen'
    default:
      return 'fullscreen'
  }
})

const providerLabel = computed(() => {
  if (!embed.value) return 'Embed'
  switch (embed.value.provider) {
    case EmbedProvider.Youtube:
      return 'YouTube'
    case EmbedProvider.Spotify:
      return 'Spotify'
    case EmbedProvider.GoogleMaps:
      return 'Google Maps'
    case EmbedProvider.GoogleCalendar:
      return 'Google Calendar'
    case EmbedProvider.GoogleSlides:
      return 'Google Slides'
    case EmbedProvider.Figma:
      return 'Figma'
    case EmbedProvider.GithubGist:
      return 'GitHub Gist'
    case EmbedProvider.Tldraw:
      return 'tldraw'
    default:
      return 'Embed'
  }
})
</script>

<template>
  <div class="wov-embed-block">
    <div v-if="!iframeSrc" class="wov-embed-placeholder">
      <span>{{ providerLabel }}</span>
    </div>
    <iframe
      v-else
      :src="iframeSrc"
      :allow="iframeAllow"
      allowfullscreen
      frameborder="0"
      class="wov-embed-iframe"
      :style="{ pointerEvents: edited ? 'auto' : 'none' }"
    />
  </div>
</template>

<style>
.wov-embed-block {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.wov-embed-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.wov-embed-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(128, 128, 128, 0.1);
  border: 1px dashed rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  color: rgba(128, 128, 128, 0.7);
  font-size: 14px;
}
</style>
