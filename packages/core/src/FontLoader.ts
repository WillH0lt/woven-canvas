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
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = family.url
      link.onload = () => {
        FontLoader.loadedFonts.add(family)
        resolve()
      }
      link.onerror = () => {
        reject(new Error(`Failed to load font: ${family}`))
      }
      document.head.appendChild(link)
    })
  }
}
