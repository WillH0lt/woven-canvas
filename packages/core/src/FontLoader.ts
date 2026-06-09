import { z } from 'zod'

/**
 * Font family definition schema.
 * Defines a custom font that can be loaded and used in text blocks.
 */
export const FontFamily = z.object({
  /** The CSS font-family name */
  name: z.string(),
  /** Display name shown in the font selector UI */
  displayName: z.string(),
  /** URL to the font stylesheet (e.g., Google Fonts URL) */
  url: z.string(),
  /** Optional preview image URL for the font selector */
  previewImage: z.string().optional(),
  /** Whether this font appears in the font selector (default: true) */
  selectable: z.boolean().default(true),
  /**
   * Font weights to load (e.g., [400, 700] for regular and bold).
   * Only applies to Google Fonts URLs - will auto-construct the variant URL.
   * Default: [400, 700]
   */
  weights: z.array(z.number()).default([400, 700]),
  /**
   * Whether to also load italic variants for each weight.
   * Only applies to Google Fonts URLs.
   * Default: true
   */
  italics: z.boolean().default(true),
})

export type FontFamily = z.infer<typeof FontFamily>
export type FontFamilyInput = z.input<typeof FontFamily>

/**
 * FontLoader handles loading custom fonts from URLs.
 * It tracks which fonts have been loaded to avoid duplicate loading.
 */
export class FontLoader {
  private loadedFonts: Set<string> = new Set()

  /**
   * Load multiple font families.
   * Fonts that have already been loaded will be skipped.
   *
   * @param families - Array of font families to load
   */
  async loadFonts(families: FontFamily[]): Promise<void> {
    const unloadedFamilies = families.filter((family) => !this.loadedFonts.has(family.name))

    if (unloadedFamilies.length === 0) {
      return
    }

    const fontPromises = unloadedFamilies.map((family) => this.loadSingleFont(family))
    await Promise.all(fontPromises)
  }

  /**
   * Build a Google Fonts URL with weight and italic variants.
   * Format: https://fonts.googleapis.com/css2?family=FontName:ital,wght@0,400;0,700;1,400;1,700
   *
   * @param family - Font family configuration
   * @returns The constructed URL with variants
   */
  private buildGoogleFontsUrl(family: FontFamily): string {
    const baseUrl = family.url

    // Check if this is a Google Fonts URL
    if (!baseUrl.includes('fonts.googleapis.com')) {
      return baseUrl
    }

    // Extract the font family name from the URL
    const urlObj = new URL(baseUrl)
    const familyParam = urlObj.searchParams.get('family')
    if (!familyParam) {
      return baseUrl
    }

    // Get the base family name (remove any existing weight/style specifiers)
    const baseFamilyName = familyParam.split(':')[0]

    // Build the variant specifier
    const weights = family.weights
    const variants: string[] = []

    if (family.italics) {
      // Format: ital,wght@0,400;0,700;1,400;1,700
      for (const weight of weights) {
        variants.push(`0,${weight}`) // Normal
      }
      for (const weight of weights) {
        variants.push(`1,${weight}`) // Italic
      }
      urlObj.searchParams.set('family', `${baseFamilyName}:ital,wght@${variants.join(';')}`)
    } else {
      // Format: wght@400;700
      urlObj.searchParams.set('family', `${baseFamilyName}:wght@${weights.join(';')}`)
    }

    return urlObj.toString()
  }

  /**
   * Load a single font family.
   * Fetches the stylesheet as text and injects it via an inline <style>, so
   * the @font-face rules land in a same-origin sheet. Tools that introspect
   * CSSOM (e.g. modern-screenshot's font embedding for /preview raster
   * captures) can't read cross-origin sheets, which a <link> to
   * fonts.googleapis.com would produce.
   *
   * @param family - Font family to load
   */
  private async loadSingleFont(family: FontFamily): Promise<void> {
    this.loadedFonts.add(family.name)

    // Skip actual font loading in SSR/headless — fonts are loaded client-side
    if (typeof document === 'undefined') return

    const url = this.buildGoogleFontsUrl(family)
    let cssText: string
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      cssText = await res.text()
    } catch (err) {
      throw new Error(`Failed to load font stylesheet: ${family.name}. ${err}`)
    }

    const style = document.createElement('style')
    style.setAttribute('data-wov-font-family', family.name)
    style.textContent = cssText
    document.head.appendChild(style)

    try {
      const loadPromises = this.getFontLoadPromises(family)
      await Promise.all(loadPromises)
      await document.fonts.ready
    } catch (err) {
      throw new Error(`Failed to load font face for: ${family.name}. ${err}`)
    }
  }

  /**
   * Get promises for loading all font variants (weights and italics).
   *
   * @param family - Font family configuration
   * @returns Array of promises for loading each font variant
   */
  private getFontLoadPromises(family: FontFamily): Promise<FontFace[]>[] {
    const promises: Promise<FontFace[]>[] = []
    const fontName = family.name

    for (const weight of family.weights) {
      // Load normal variant
      promises.push(document.fonts.load(`${weight} 12px "${fontName}"`))

      // Load italic variant if enabled
      if (family.italics) {
        promises.push(document.fonts.load(`italic ${weight} 12px "${fontName}"`))
      }
    }

    return promises
  }

  /**
   * Check if a font has been loaded.
   *
   * @param fontName - The font-family name to check
   * @returns True if the font has been loaded
   */
  isLoaded(fontName: string): boolean {
    return this.loadedFonts.has(fontName)
  }

  /**
   * Get the set of loaded font names.
   */
  getLoadedFonts(): ReadonlySet<string> {
    return this.loadedFonts
  }
}
