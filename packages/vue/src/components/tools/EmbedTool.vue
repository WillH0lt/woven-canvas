<script setup lang="ts">
import { ref, computed, inject, watch, nextTick, type Ref } from 'vue'
import {
  Block,
  Camera,
  Screen,
  Grid,
  Embed,
  EmbedProvider,
  addComponent,
  createEntity,
  detectEmbedProvider,
  resolveEmbedUrl,
  validateEmbedUrl,
} from '@woven-canvas/core'
import { Synced } from '@woven-ecs/canvas-store'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

import { useTooltipSingleton } from '../../composables/useTooltipSingleton'
import { useEditorContext } from '../../composables/useEditorContext'
import { useToolbar } from '../../composables/useToolbar'
import { CursorKind } from '../../cursors'

const { nextEditorTick } = useEditorContext()
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton()
const { setTool } = useToolbar()

const buttonRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const urlInputRef = ref<HTMLInputElement | null>(null)

// Panel state
const panelOpen = ref(false)
const selectedProvider = ref<EmbedProvider | null>(null)
const urlValue = ref('')
const urlError = ref('')

// Get container ref for teleport
const containerRef = inject<Ref<HTMLElement | null>>('containerRef')

// Floating UI
const { floatingStyles } = useFloating(buttonRef, panelRef, {
  placement: 'top',
  middleware: [offset(16), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

const providers = [
  { value: EmbedProvider.Youtube, label: 'YouTube', icon: 'youtube' },
  { value: EmbedProvider.Spotify, label: 'Spotify', icon: 'spotify' },
  { value: EmbedProvider.GoogleMaps, label: 'Google Maps', icon: 'map' },
  {
    value: EmbedProvider.GoogleCalendar,
    label: 'Google Calendar',
    icon: 'calendar',
  },
  {
    value: EmbedProvider.GoogleSlides,
    label: 'Google Slides',
    icon: 'slides',
  },
  { value: EmbedProvider.Figma, label: 'Figma', icon: 'figma' },
  { value: EmbedProvider.GithubGist, label: 'GitHub Gist', icon: 'gist' },
  { value: EmbedProvider.Tldraw, label: 'tldraw', icon: 'tldraw' },
] as const

const urlPlaceholder = computed(() => {
  if (!selectedProvider.value) return 'Paste a URL...'
  switch (selectedProvider.value) {
    case EmbedProvider.Youtube:
      return 'https://www.youtube.com/watch?v=...'
    case EmbedProvider.Spotify:
      return 'https://open.spotify.com/track/...'
    case EmbedProvider.GoogleMaps:
      return 'https://www.google.com/maps/...'
    case EmbedProvider.GoogleCalendar:
      return 'https://calendar.google.com/...'
    case EmbedProvider.GoogleSlides:
      return 'https://docs.google.com/presentation/...'
    case EmbedProvider.Figma:
      return 'https://www.figma.com/...'
    case EmbedProvider.GithubGist:
      return 'https://gist.github.com/...'
    case EmbedProvider.Tldraw:
      return 'https://www.tldraw.com/...'
    default:
      return 'Paste a URL...'
  }
})

function handleClick() {
  panelOpen.value = !panelOpen.value
  selectedProvider.value = null
  urlValue.value = ''
  urlError.value = ''
}

function selectProvider(provider: EmbedProvider) {
  selectedProvider.value = provider
  urlValue.value = ''
  urlError.value = ''
  nextTick(() => {
    urlInputRef.value?.focus()
  })
}

function goBack() {
  selectedProvider.value = null
  urlValue.value = ''
  urlError.value = ''
}

async function submitUrl() {
  const url = urlValue.value.trim()
  if (!url) {
    urlError.value = 'Please enter a URL'
    return
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    urlError.value = 'Please enter a valid URL'
    return
  }

  const provider = selectedProvider.value ?? detectEmbedProvider(url)

  // Validate URL matches the selected provider
  const validationError = validateEmbedUrl(url, provider)
  if (validationError) {
    urlError.value = validationError
    return
  }

  const embedUrl = resolveEmbedUrl(url, provider)

  // Default sizes per provider
  let width = 480
  let height = 320
  switch (provider) {
    case EmbedProvider.Youtube:
      width = 560
      height = 315
      break
    case EmbedProvider.Spotify:
      width = 352
      height = 152
      break
    case EmbedProvider.GoogleMaps:
      width = 600
      height = 450
      break
    case EmbedProvider.GoogleCalendar:
      width = 600
      height = 500
      break
    case EmbedProvider.GoogleSlides:
      width = 640
      height = 389
      break
    case EmbedProvider.Figma:
      width = 600
      height = 400
      break
    case EmbedProvider.GithubGist:
      width = 500
      height = 300
      break
    case EmbedProvider.Tldraw:
      width = 600
      height = 400
      break
  }

  // Get viewport center in world coordinates
  const ctx = await nextEditorTick()
  const camera = Camera.read(ctx)
  const screen = Screen.read(ctx)
  const centerX = camera.left + screen.width / camera.zoom / 2
  const centerY = camera.top + screen.height / camera.zoom / 2

  // Snap size to grid if enabled
  const grid = Grid.read(ctx)
  if (grid.enabled) {
    width = Math.max(grid.colWidth, Math.round(width / grid.colWidth) * grid.colWidth)
    height = Math.max(grid.rowHeight, Math.round(height / grid.rowHeight) * grid.rowHeight)
  }

  // Create entity
  const entityId = createEntity(ctx)

  addComponent(ctx, entityId, Block)
  const block = Block.write(ctx, entityId)
  block.tag = 'embed'
  block.position[0] = centerX - width / 2
  block.position[1] = centerY - height / 2
  block.size[0] = width
  block.size[1] = height

  Grid.snapPosition(ctx, block.position)

  addComponent(ctx, entityId, Embed)
  const embed = Embed.write(ctx, entityId)
  embed.url = url
  embed.embedUrl = embedUrl
  embed.provider = provider

  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  })

  // Close panel and switch to select tool
  panelOpen.value = false
  selectedProvider.value = null
  urlValue.value = ''
  setTool('select', undefined, CursorKind.Select)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitUrl()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (selectedProvider.value) {
      goBack()
    } else {
      panelOpen.value = false
    }
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (buttonRef.value && !buttonRef.value.contains(target) && panelRef.value && !panelRef.value.contains(target)) {
    panelOpen.value = false
  }
}

watch(panelOpen, (open) => {
  if (open) {
    document.addEventListener('click', handleClickOutside, true)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
  }
})

function handleMouseEnter() {
  if (buttonRef.value) {
    showTooltip('Embed', buttonRef.value)
  }
}

function handleMouseLeave() {
  hideTooltip()
}
</script>

<template>
  <button
    ref="buttonRef"
    class="wov-toolbar-button"
    :class="{ 'menu-open': panelOpen }"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  </button>

  <!-- Embed panel (teleported to canvas root) -->
  <Teleport v-if="containerRef" :to="containerRef">
    <div
      v-if="panelOpen"
      ref="panelRef"
      class="wov-embed-panel"
      :style="floatingStyles"
    >
      <!-- Provider selection -->
      <template v-if="!selectedProvider">
        <div class="wov-embed-panel-header">Add embed</div>
        <div class="wov-embed-provider-grid">
          <button
            v-for="p in providers"
            :key="p.value"
            class="wov-embed-provider-button"
            @click="selectProvider(p.value)"
          >
            <span class="wov-embed-provider-icon">
              <!-- YouTube -->
              <svg v-if="p.icon === 'youtube'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.5 17V7a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" />
                <path d="m10 15 5-3-5-3z" />
              </svg>
              <!-- Spotify -->
              <svg v-else-if="p.icon === 'spotify'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 11.973c2.5-1.473 5.5-.973 7.5.527" />
                <path d="M9 15c1.5-1 4-.5 5.5.5" />
                <path d="M7 9c3-2 7-1 10 1" />
              </svg>
              <!-- Google Maps -->
              <svg v-else-if="p.icon === 'map'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <!-- Google Calendar -->
              <svg v-else-if="p.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <!-- Google Slides -->
              <svg v-else-if="p.icon === 'slides'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <!-- Figma -->
              <svg v-else-if="p.icon === 'figma'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
                <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
                <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
                <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
                <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
              </svg>
              <!-- GitHub Gist -->
              <svg v-else-if="p.icon === 'gist'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <!-- tldraw -->
              <svg v-else-if="p.icon === 'tldraw'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.474 0H2.526C1.131 0 0 1.18 0 2.637v18.726C0 22.819 1.131 24 2.526 24h18.948C22.869 24 24 22.82 24 21.363V2.637C24 1.181 22.869 0 21.474 0m-11.01 5.388q.595-.607 1.474-.607q.854 0 1.448.607q.595.606.595 1.476c0 .87-.198 1.072-.595 1.476a1.95 1.95 0 0 1-1.448.607q-.879 0-1.474-.607q-.594-.606-.594-1.476c0-.87.198-1.072.594-1.476m3.13 11.49a4.9 4.9 0 0 1-2.018 2.136q-.724.422-1.19-.026q-.438-.422.26-1.002q.387-.29.646-.738q.258-.449.336-.923q.026-.21-.181-.21q-.517-.027-1.06-.581t-.543-1.37q0-.87.594-1.477a2.02 2.02 0 0 1 1.5-.633q.828 0 1.448.633q.62.605.724 1.37q.207 1.424-.517 2.822z"/>
              </svg>
            </span>
            <span class="wov-embed-provider-label">{{ p.label }}</span>
          </button>
        </div>
      </template>

      <!-- URL input -->
      <template v-else>
        <div class="wov-embed-panel-header">
          <button class="wov-embed-back-button" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span>{{ providers.find((p) => p.value === selectedProvider)?.label }}</span>
        </div>
        <div class="wov-embed-url-form">
          <input
            ref="urlInputRef"
            v-model="urlValue"
            type="text"
            :placeholder="urlPlaceholder"
            class="wov-embed-url-input"
            @keydown="handleKeydown"
          />
          <div v-if="urlError" class="wov-embed-url-error">{{ urlError }}</div>
          <button class="wov-embed-submit-button" @click="submitUrl">
            Embed
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style>
.wov-embed-panel {
  background-color: var(--wov-gray-100);
  border-radius: var(--wov-menu-border-radius);
  box-shadow:
    0px 0px 0.5px rgba(0, 0, 0, 0.18),
    0px 3px 8px rgba(0, 0, 0, 0.1),
    0px 1px 3px rgba(0, 0, 0, 0.1);
  z-index: var(--wov-z-dropdown);
  width: max-content;
  font-family: var(--wov-font-family);
  font-size: 13px;
  color: var(--wov-gray-700);
}

.wov-embed-panel-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px 6px;
  font-weight: 600;
  font-size: 13px;
}

.wov-embed-back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-500);
  border-radius: 4px;
  padding: 0;
}

.wov-embed-back-button:hover {
  background-color: var(--wov-gray-200);
}

.wov-embed-back-button svg {
  width: 16px;
  height: 16px;
}

.wov-embed-provider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 6px 6px 8px;
}

.wov-embed-provider-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--wov-gray-700);
  border-radius: 8px;
  font-family: var(--wov-font-family);
  font-size: 12px;
  white-space: nowrap;
}

.wov-embed-provider-button:hover {
  background-color: var(--wov-gray-200);
}

.wov-embed-provider-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.wov-embed-provider-icon svg {
  width: 18px;
  height: 18px;
}

.wov-embed-provider-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.wov-embed-url-form {
  padding: 4px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wov-embed-url-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--wov-gray-300);
  border-radius: 8px;
  font-family: var(--wov-font-family);
  font-size: 13px;
  color: var(--wov-gray-700);
  background: white;
  outline: none;
}

.wov-embed-url-input:focus {
  border-color: var(--wov-primary);
  box-shadow: 0 0 0 2px rgba(106, 88, 242, 0.2);
}

.wov-embed-url-input::placeholder {
  color: var(--wov-gray-400);
}

.wov-embed-url-error {
  color: var(--wov-error);
  font-size: 12px;
}

.wov-embed-submit-button {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background-color: var(--wov-primary);
  color: white;
  font-family: var(--wov-font-family);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.wov-embed-submit-button:hover {
  background-color: var(--wov-primary-light);
}
</style>
