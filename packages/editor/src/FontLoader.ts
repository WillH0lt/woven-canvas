import { z } from "zod";

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
});

export type FontFamily = z.infer<typeof FontFamily>;
export type FontFamilyInput = z.input<typeof FontFamily>;

/**
 * FontLoader handles loading custom fonts from URLs.
 * It tracks which fonts have been loaded to avoid duplicate loading.
 */
export class FontLoader {
  private loadedFonts: Set<string> = new Set();

  /**
   * Load multiple font families.
   * Fonts that have already been loaded will be skipped.
   *
   * @param families - Array of font families to load
   */
  async loadFonts(families: FontFamily[]): Promise<void> {
    const unloadedFamilies = families.filter(
      (family) => !this.loadedFonts.has(family.name)
    );

    if (unloadedFamilies.length === 0) {
      return;
    }

    const fontPromises = unloadedFamilies.map((family) =>
      this.loadSingleFont(family)
    );
    await Promise.all(fontPromises);
  }

  /**
   * Load a single font family.
   * Adds a link element to the document head and waits for the font to be ready.
   *
   * @param family - Font family to load
   */
  private loadSingleFont(family: FontFamily): Promise<void> {
    this.loadedFonts.add(family.name);

    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = family.url;
      link.onload = async () => {
        try {
          // Wait for the font to be actually loaded and ready to use
          await document.fonts.load(`12px "${family.name}"`);
          // Ensure all fonts are ready
          await document.fonts.ready;
          resolve();
        } catch (error) {
          reject(
            new Error(`Failed to load font face for: ${family.name}. ${error}`)
          );
        }
      };
      link.onerror = () => {
        reject(new Error(`Failed to load font stylesheet: ${family.name}`));
      };
      document.head.appendChild(link);
    });
  }

  /**
   * Check if a font has been loaded.
   *
   * @param fontName - The font-family name to check
   * @returns True if the font has been loaded
   */
  isLoaded(fontName: string): boolean {
    return this.loadedFonts.has(fontName);
  }

  /**
   * Get the set of loaded font names.
   */
  getLoadedFonts(): ReadonlySet<string> {
    return this.loadedFonts;
  }
}
