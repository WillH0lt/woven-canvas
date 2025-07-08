import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import { LexoRank } from 'lexorank'
import * as PIXI from 'pixi.js'

import type { RendererResources } from '../types'

// function calculateFontSize(chars: string[], height: number, style: PIXI.TextStyle): number {
//   const bitmapFont = PIXI.BitmapFontManager.getFont(chars.join(''), style);
//   const lineHeight = bitmapFont.lineHeight / bitmapFont.baseMeasurementFontSize;

//   // Clone style to avoid modifying the original
//   const testStyle = style.clone();

//   // Binary search for faster convergence
//   let low = 1;
//   let high = height;
//   let fontSize = testStyle.fontSize;

//   const t1 = performance.now();
//   let guesses = 0;
//   const tolerance = 0.5;

//   while (high - low > tolerance && guesses < 15) {
//     guesses++;
    
//     fontSize = (low + high) / 2;
//     testStyle.fontSize = fontSize;
    
//     const layout = PIXI.getBitmapTextLayout(chars, testStyle, bitmapFont, false);
//     const actualHeight = layout.lines.length * lineHeight * fontSize;
    
//     if (actualHeight > height) {
//       high = fontSize; // Font size is too large
//     } else {
//       low = fontSize; // Font size is too small
//     }
//   }

//   const t2 = performance.now();

//   console.log(`got ${fontSize} in ${guesses} guesses, ${t2 - t1}ms`);
//   return fontSize;
// }

// function calculateFontSize(chars: string[], height: number, style: PIXI.TextStyle): number {
//   const bitmapFont = PIXI.BitmapFontManager.getFont(chars.join(''), style);
//   const lineHeight = bitmapFont.lineHeight / bitmapFont.baseMeasurementFontSize;

//   // Binary search approach for faster convergence
//   let low = 1; // Minimum font size
//   let high = height; // Maximum font size
//   let fontSize = style.fontSize;

//   const t1 = performance.now()
//   let guesses = 0
//   while (high - low > 0.1) {
//     guesses++
    
//     fontSize = (low + high) / 2;
//     style.fontSize = fontSize;

//     const layout = PIXI.getBitmapTextLayout(chars, style, bitmapFont, false);
//     const totalHeight = layout.lines.length * lineHeight * fontSize;

//     if (totalHeight > height) {
//       high = fontSize; // Font size is too large
//     } else {
//       low = fontSize; // Font size is too small
//     }
//   }

//   const t2 = performance.now()

//   console.log(`got ${fontSize} in ${guesses} guesses, ${t2 - t1}ms`)
//   return fontSize;
// }

function calculateFontSize(chars: string[], height: number, style: PIXI.TextStyle): number {

  // relative to font size
  const avgLengthPerCharacter = 2

  // initial guess
  let lines = avgLengthPerCharacter * style.fontSize / style.wordWrapWidth

  // const len = layout.lines.length * (style.wordWrapWidth / style.fontSize)

  // len is close to 2
  // lines = len * fontSize / width

  const bitmapFont = PIXI.BitmapFontManager.getFont(chars.join(''), style)
  const lineHeight = bitmapFont.lineHeight / bitmapFont.baseMeasurementFontSize

  while (true) {
    style.fontSize = height / lines / lineHeight

    const layout = PIXI.getBitmapTextLayout(chars, style, bitmapFont, false)
    if (layout.lines.length < lines) {
      return style.fontSize
    }

    lines++
  }
}


export class RenderPixi extends System {
  private readonly screens = this.query((q) => q.changed.with(comps.Screen).trackWrites)

  private readonly blocks = this.query((q) => q.addedOrChanged.and.removed.with(comps.Block).trackWrites)

  private readonly rectangles = this.query((q) =>
    q.addedOrChanged.with(comps.Block).trackWrites.and.without(comps.Text),
  )

  private readonly texts = this.query(
    (q) => q.addedOrChanged.and.removed.with(comps.Block).trackWrites.and.with(comps.Text).trackWrites,
  )

  private readonly cameras = this.query((q) => q.changed.with(comps.Camera).trackWrites)

  protected declare readonly resources: RendererResources

  public execute(): void {
    let needsSorting = false

    for (const textEntity of this.texts.addedOrChanged) {
      const block = textEntity.read(comps.Block)
      const text = textEntity.read(comps.Text)
      
      let textObject = this.resources.viewport.getChildByLabel(block.id) as PIXI.BitmapText
      if (!textObject) {
        const style = new PIXI.TextStyle({
          fontFamily: 'Figtree',
          fill: '#ffcc00',
          wordWrap: true,
          align: 'center',
          fontSize: 24, // guess value
        })

        textObject = new PIXI.BitmapText({
          style
        })
        textObject.label = block.id
        this.resources.viewport.addChild(textObject)
      }
      
      textObject.style.wordWrapWidth = block.width
      if (block.height !== textObject.height) {
        textObject.style.fontSize = calculateFontSize(text.content.split(''), block.height, textObject.style)
      }
      
      textObject.text = text.content
    }

    for (const rectangleEntity of this.rectangles.addedOrChanged) {
      const block = rectangleEntity.read(comps.Block)

      let shapeObj = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (!shapeObj) {
        shapeObj = new PIXI.Graphics()
        shapeObj.label = block.id
      }

      shapeObj.clear()
      const color = (block.red << 16) | (block.green << 8) | block.blue
      const alpha = block.alpha / 255
      shapeObj.beginFill(color, alpha)
      shapeObj.drawRect(0, 0, block.width, block.height)
      shapeObj.endFill()

      this.resources.viewport.addChild(shapeObj)
    }

    for (const blockEntity of this.blocks.addedOrChanged) {
      const block = blockEntity.read(comps.Block)

      const blockObj = this.resources.viewport.getChildByLabel(block.id) as PIXI.Container

      if (!blockObj) {
        console.warn('Block does not have a PIXI object:', block)
        continue
      }

      if (blockObj.rank !== block.rank) {
        needsSorting = true
      }

      blockObj.position.set(block.left, block.top)
      blockObj.rotation = block.rotateZ
      blockObj.rank = block.rank

      if (block.id === '') {
        console.warn('Block does not have an ID:', block)
      }
    }

    if (this.blocks.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const blockEntity of this.blocks.removed) {
      const block = blockEntity.read(comps.Block)

      // Remove the PIXI graphics object for the block
      const graphics = this.resources.viewport.getChildByLabel(block.id) as PIXI.Graphics
      if (graphics) {
        this.resources.viewport.removeChild(graphics)
        graphics.destroy({ children: true, texture: true })
      }
    }

    if (needsSorting) {
      this.resources.viewport.children.sort((a, b) => {
        const rankA = LexoRank.parse(a.rank ?? '0')
        const rankB = LexoRank.parse(b.rank ?? '0')
        return rankA.compareTo(rankB)
      })
    }

    // Handle domElement resizing
    if (this.screens.changed.length) {
      const screen = this.screens.changed[0].read(comps.Screen)
      this.resources.app.renderer.resize(screen.width, screen.height)
    }

    if (this.cameras.changed.length) {
      const camera = this.cameras.changed[0].read(comps.Camera)
      this.resources.viewport.scale.set(camera.zoom, camera.zoom)
      this.resources.viewport.position.set(-camera.left * camera.zoom, -camera.top * camera.zoom)
    }

    this.resources.app.render()
  }
}
