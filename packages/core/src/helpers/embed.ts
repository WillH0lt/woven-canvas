import { EmbedProvider } from '../components/Embed'

/**
 * Detect the embed provider from a URL.
 */
export function detectEmbedProvider(url: string): EmbedProvider {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'youtu.be') return EmbedProvider.Youtube
    if (host === 'open.spotify.com' || host === 'spotify.com') return EmbedProvider.Spotify
    if (host === 'google.com' && parsed.pathname.startsWith('/maps')) return EmbedProvider.GoogleMaps
    if (host === 'maps.google.com') return EmbedProvider.GoogleMaps
    if (host === 'calendar.google.com') return EmbedProvider.GoogleCalendar
    if (host === 'docs.google.com' && parsed.pathname.includes('/presentation')) return EmbedProvider.GoogleSlides
    if (host === 'figma.com' || host.endsWith('.figma.com')) return EmbedProvider.Figma
    if (host === 'gist.github.com') return EmbedProvider.GithubGist
    if (host === 'tldraw.com' || host.endsWith('.tldraw.com')) return EmbedProvider.Tldraw

    return EmbedProvider.Unknown
  } catch {
    return EmbedProvider.Unknown
  }
}

/**
 * Validate that a URL is a recognized link for the given provider.
 * Returns an error message if invalid, or null if valid.
 */
export function validateEmbedUrl(url: string, provider: EmbedProvider): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    switch (provider) {
      case EmbedProvider.Youtube: {
        if (host === 'youtu.be') return null
        if (host !== 'youtube.com') return 'URL must be from youtube.com'
        if (parsed.pathname === '/watch' && parsed.searchParams.has('v')) return null
        if (parsed.pathname.startsWith('/embed/')) return null
        return 'Paste a YouTube video link (e.g. youtube.com/watch?v=...)'
      }
      case EmbedProvider.Spotify: {
        if (host !== 'open.spotify.com' && host !== 'spotify.com') return 'URL must be from open.spotify.com'
        if (parsed.pathname.length <= 1) return 'Paste a Spotify track, album, or playlist link'
        return null
      }
      case EmbedProvider.GoogleMaps: {
        if (host !== 'google.com' && host !== 'maps.google.com') return 'URL must be from google.com/maps'
        if (!parsed.pathname.startsWith('/maps') && host !== 'maps.google.com') return 'Paste a Google Maps link'
        return null
      }
      case EmbedProvider.GoogleCalendar: {
        if (host !== 'calendar.google.com') return 'URL must be from calendar.google.com'
        return null
      }
      case EmbedProvider.GoogleSlides: {
        if (host !== 'docs.google.com') return 'URL must be from docs.google.com'
        if (!parsed.pathname.includes('/presentation/')) return 'Paste a Google Slides presentation link'
        return null
      }
      case EmbedProvider.Figma: {
        if (host !== 'figma.com' && !host.endsWith('.figma.com')) return 'URL must be from figma.com'
        return null
      }
      case EmbedProvider.GithubGist: {
        if (host !== 'gist.github.com') return 'URL must be from gist.github.com'
        return null
      }
      case EmbedProvider.Tldraw: {
        if (host !== 'tldraw.com' && !host.endsWith('.tldraw.com')) return 'URL must be from tldraw.com'
        return null
      }
      default:
        return null
    }
  } catch {
    return 'Please enter a valid URL'
  }
}

/**
 * Convert a user-facing URL into an embeddable iframe URL.
 * Returns the original URL if no transformation is needed.
 */
export function resolveEmbedUrl(url: string, provider?: EmbedProvider): string {
  const p = provider ?? detectEmbedProvider(url)

  try {
    const parsed = new URL(url)

    switch (p) {
      case EmbedProvider.Youtube: {
        // youtube.com/watch?v=ID → youtube.com/embed/ID
        const host = parsed.hostname.replace(/^www\./, '')
        if (host === 'youtu.be') {
          const videoId = parsed.pathname.slice(1)
          return `https://www.youtube.com/embed/${videoId}`
        }
        const videoId = parsed.searchParams.get('v')
        if (videoId && parsed.pathname === '/watch') {
          return `https://www.youtube.com/embed/${videoId}`
        }
        // Already an embed URL or other format
        return url
      }

      case EmbedProvider.Spotify: {
        // open.spotify.com/track/ID → open.spotify.com/embed/track/ID
        if (!parsed.pathname.startsWith('/embed/')) {
          return `https://open.spotify.com/embed${parsed.pathname}`
        }
        return url
      }

      case EmbedProvider.GoogleMaps: {
        // Already an embed URL
        if (parsed.pathname.startsWith('/maps/embed')) return url
        if (parsed.searchParams.get('output') === 'embed') return url

        // google.com/maps/place/PLACE → embed search query
        const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/)
        if (placeMatch) {
          return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(placeMatch[1]))}&output=embed`
        }

        // google.com/maps?q=QUERY
        const q = parsed.searchParams.get('q')
        if (q) {
          return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
        }

        // google.com/maps/@lat,lng,zoom
        const atMatch = parsed.pathname.match(/\/@(-?[\d.]+),(-?[\d.]+),(\d+\.?\d*)z/)
        if (atMatch) {
          const [, lat, lng, zoom] = atMatch
          return `https://www.google.com/maps?q=${lat},${lng}&z=${Math.round(parseFloat(zoom))}&output=embed`
        }

        // Fallback: use the full URL as a search query
        return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`
      }

      case EmbedProvider.GoogleSlides: {
        // .../presentation/d/ID/edit → .../presentation/d/ID/embed
        return url.replace(/\/(edit|pub)(#.*)?(\?.*)?$/, '/embed')
      }

      case EmbedProvider.Figma: {
        // Wrap in Figma's embed endpoint
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      }

      case EmbedProvider.GithubGist: {
        // Gist URLs work directly as iframe srcdoc via .pibb extension
        if (!url.endsWith('.pibb')) {
          return `${url}.pibb`
        }
        return url
      }

      default:
        return url
    }
  } catch {
    return url
  }
}
