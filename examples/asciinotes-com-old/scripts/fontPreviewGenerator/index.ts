// this script reads ttf fonts in the fonts directory and generates preview images for them
// the images are black text on transparent background, the text is the font name rendered in the font itself
// the images are saved in the previews directory
//
// Configuration:
// - Height is settable via defaultOptions.height (default: 150px)
// - Width is automatically calculated based on the rendered text width
// - Font size, padding, and colors are also configurable below

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import Bun from 'bun'
import puppeteer from 'puppeteer'

interface FontPreviewOptions {
  height: number
  fontSize: number
  padding: number
  backgroundColor: string
  textColor: string
}

const defaultOptions: FontPreviewOptions = {
  height: 48,
  fontSize: 48,
  padding: 0,
  backgroundColor: 'transparent',
  textColor: '#000000',
}

function formatFontNameForDisplay(fontName: string): string {
  // Add spaces before capital letters (except the first one)
  // Split on capital letters and rejoin with spaces
  return (
    fontName
      // Insert space before any capital letter that follows a lowercase letter
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Clean up any double spaces
      .replace(/\s+/g, ' ')
      .trim()
  )
}

async function convertHtmlToPng(
  htmlPath: string,
  pngPath: string,
  page: any, // Reuse the same page instance
): Promise<void> {
  // Load the HTML file
  const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`
  await page.goto(fileUrl, { waitUntil: 'networkidle0' })

  // Wait for fonts to load properly using document.fonts.ready
  await page.evaluate(() => {
    return document.fonts.ready
  })

  // Wait for the font-loaded class to be applied
  await page.waitForSelector('.preview-text.font-loaded', {
    visible: true,
    timeout: 10000,
  })

  // Additional wait to ensure font rendering is complete
  await page.waitForTimeout(100)

  // Verify font is actually loaded by checking computed styles
  const fontLoaded = await page.evaluate(() => {
    const element = document.querySelector('.preview-text')
    if (!element) return false

    const computedStyle = window.getComputedStyle(element)
    const fontFamily = computedStyle.fontFamily

    // Check if our custom font is in the font stack
    console.log('Computed font family:', fontFamily)
    return fontFamily.includes('Font')
  })

  console.log(`Font loaded status for ${htmlPath.split('/').pop()?.replace('.html', '')}: ${fontLoaded}`)

  // Take screenshot of the preview container (it will auto-size to content)
  const element = await page.$('.preview-container')
  if (element) {
    await element.screenshot({
      path: pngPath,
      type: 'png',
      omitBackground: true,
    })
  } else {
    // Fallback: get the actual dimensions of the content
    const dimensions = await page.evaluate(() => {
      const container = document.querySelector('.preview-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }
      return { width: 400, height: 150 }
    })

    await page.screenshot({
      path: pngPath,
      type: 'png',
      omitBackground: true,
      clip: {
        x: 20,
        y: 20,
        width: dimensions.width,
        height: dimensions.height,
      },
    })
  }
}

async function generateFontPreview(
  fontPath: string,
  fontName: string,
  outputPath: string,
  options: FontPreviewOptions = defaultOptions,
): Promise<{ htmlPath: string; fontPath: string } | null> {
  try {
    // Create temporary files in previews directory for PNG generation
    const previewsDir = join(import.meta.dir, 'previews')
    const fontFileName = `${fontName}.ttf`
    const localFontPath = join(previewsDir, fontFileName)

    // Copy the font file temporarily
    const fontBuffer = await Bun.file(fontPath).arrayBuffer()
    await Bun.write(localFontPath, fontBuffer)

    // Format the font name for display (add spaces between words)
    const displayName = formatFontNameForDisplay(fontName)

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @font-face {
            font-family: '${fontName}Font';
            src: url('./${fontFileName}') format('truetype');
            font-display: block;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: ${options.backgroundColor};
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .preview-container {
            height: ${options.height}px;
            background: ${options.backgroundColor};
            display: inline-flex;
            justify-content: center;
            align-items: center;
            padding: 0 ${options.padding}px;
            min-width: fit-content;
        }
        
        .preview-text {
            font-family: '${fontName}Font';
            font-size: ${options.fontSize}px;
            color: ${options.textColor};
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            visibility: hidden;
        }
        
        .preview-text.font-loaded {
            visibility: visible;
        }
        
        /* Fallback for screenshot tools */
        @media print {
            body { height: ${options.height}px; width: auto; }
            .preview-container { border: none; }
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-text" id="preview-text">${displayName}</div>
    </div>
    
    <script>
        // Wait for font to load before showing text
        document.fonts.ready.then(() => {
            const textElement = document.getElementById('preview-text');
            textElement.classList.add('font-loaded');
        });
        
        // Fallback timeout
        setTimeout(() => {
            const textElement = document.getElementById('preview-text');
            textElement.classList.add('font-loaded');
        }, 3000);
    </script>
</body>
</html>
    `

    // Save temporary HTML file for PNG generation
    const htmlPath = outputPath.replace('.png', '.html')
    await Bun.write(htmlPath, htmlContent)

    console.log(`✓ Generated temporary files for ${fontName}`)

    // Return both paths for PNG conversion and cleanup
    return { htmlPath, fontPath: localFontPath }
  } catch (error) {
    console.error(`✗ Failed to generate preview for ${fontName}:`, error)
    return null
  }
}

async function main() {
  const fontsDir = join(import.meta.dir, 'fonts')
  const previewsDir = join(import.meta.dir, 'previews')

  // Create previews directory if it doesn't exist
  if (!existsSync(previewsDir)) {
    mkdirSync(previewsDir, { recursive: true })
    console.log('Created previews directory')
  }

  // Get all TTF files from fonts directory
  const fontFiles = readdirSync(fontsDir).filter((file) => extname(file).toLowerCase() === '.ttf')

  if (fontFiles.length === 0) {
    console.log('No TTF files found in fonts directory')
    return
  }

  console.log(`Found ${fontFiles.length} font files`)

  // Process each font file and collect temporary file paths
  const tempFiles: Array<{
    fontName: string
    htmlPath: string
    fontPath: string
    pngPath: string
  }> = []

  for (const fontFile of fontFiles) {
    const fontName = basename(fontFile, '.ttf')
    const fontPath = join(fontsDir, fontFile)
    const outputPath = join(previewsDir, `${fontName}.png`)

    const result = await generateFontPreview(fontPath, fontName, outputPath)
    if (result) {
      tempFiles.push({
        fontName,
        htmlPath: result.htmlPath,
        fontPath: result.fontPath,
        pngPath: outputPath,
      })
    }
  }

  console.log('\n🖼️ Converting HTML files to PNG...')

  // Create a single browser instance for all conversions
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode to avoid deprecation warning
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({
      width: 1200, // Large viewport to accommodate any font width
      height: defaultOptions.height, // Add some padding
      deviceScaleFactor: 2, // Higher resolution
    })

    // Convert HTML files to PNG
    for (const { fontName, htmlPath, pngPath } of tempFiles) {
      try {
        await convertHtmlToPng(htmlPath, pngPath, page)
        console.log(`✓ Generated PNG for ${fontName}`)
      } catch (error) {
        console.error(`✗ Failed to convert PNG for ${fontName}:`, error)
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n🧹 Cleaning up temporary files...')

  // Clean up temporary HTML and font files
  for (const { htmlPath, fontPath } of tempFiles) {
    try {
      // Delete HTML file
      if (existsSync(htmlPath)) {
        unlinkSync(htmlPath)
      }
      // Delete temporary font file
      if (existsSync(fontPath)) {
        unlinkSync(fontPath)
      }
    } catch (error) {
      console.warn(`Warning: Could not clean up temporary file: ${error}`)
    }
  }

  console.log('\n🎉 Font preview generation complete!')
  console.log(`\n📁 Generated files in ${previewsDir}:`)
  console.log('   • .png files - PNG image previews only')
}

// Run the script
main().catch(console.error)
