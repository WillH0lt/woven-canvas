import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

export enum EmbedProvider {
  GoogleMaps = 'google-maps',
  GoogleCalendar = 'google-calendar',
  GoogleSlides = 'google-slides',
  Tldraw = 'tldraw',
  Figma = 'figma',
  GithubGist = 'github-gist',
  Youtube = 'youtube',
  Spotify = 'spotify',
  Unknown = 'unknown',
}

/**
 * Embed component - stores the URL and provider for embedded content.
 *
 * Renders an iframe for external services like YouTube, Figma, Google Maps, etc.
 */
export const Embed = defineCanvasComponent(
  { name: 'embed', sync: 'document' },
  {
    /** The original URL provided by the user */
    url: field.string().max(2048).default(''),
    /** The resolved embed/iframe URL */
    embedUrl: field.string().max(2048).default(''),
    /** The embed provider (used for provider-specific styling/behavior) */
    provider: field.enum(EmbedProvider).default(EmbedProvider.Unknown),
  },
)
