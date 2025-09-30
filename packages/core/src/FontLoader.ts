import type { FontFamily } from './types'

export class FontLoader {
  private static loadedFonts: Set<FontFamily> = new Set()

  public static async loadFonts(families: FontFamily[]): Promise<void> {
    const unloadedFamilies = families.filter((family) => !FontLoader.loadedFonts.has(family))

    if (unloadedFamilies.length === 0) {
      return
    }

    const fontPromises = unloadedFamilies.map((family) => FontLoader.loadSingleFont(family))
    await Promise.all(fontPromises)
  }

  private static loadSingleFont(family: FontFamily): Promise<void> {
    FontLoader.loadedFonts.add(family)

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = family.url
      link.onload = async () => {
        try {
          // Wait for the font to be actually loaded and ready to use
          await document.fonts.load(`12px "${family.name}"`)
          // Ensure all fonts are ready
          await document.fonts.ready
          resolve()
        } catch (error) {
          reject(new Error(`Failed to load font face for: ${family.name}. ${error}`))
        }
      }
      link.onerror = () => {
        reject(new Error(`Failed to load font stylesheet: ${family.name}`))
      }
      document.head.appendChild(link)
    })
  }
}
