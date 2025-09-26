import { BaseSystem } from '../BaseSystem'
import { Background, Camera, Grid, Screen } from '../components'
import { RenderHtml } from './RenderHtml'

const patternCanvas = document.createElement('canvas')

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const radius = size / 2
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function createDotPattern(xSpacing: number, ySpacing: number, background: Background): CanvasPattern | null {
  const dotSize = 2

  const width = xSpacing * background.subdivisionStep
  const height = ySpacing * background.subdivisionStep
  patternCanvas.width = width
  patternCanvas.height = height

  const patternCtx = patternCanvas.getContext('2d')
  if (!patternCtx) return null

  // Clear the canvas
  patternCtx.clearRect(0, 0, width, height)
  patternCtx.fillStyle = background.strokeColor

  if (background.subdivisionStep === 1) {
    drawDot(patternCtx, width / 2, height / 2, dotSize)
  } else {
    for (let x = 0; x < background.subdivisionStep; x++) {
      for (let y = 0; y < background.subdivisionStep; y++) {
        const centerX = (x + 0.5) * (width / background.subdivisionStep)
        const centerY = (y + 0.5) * (height / background.subdivisionStep)

        const isStrongDot = x === 0 && y === 0

        const size = isStrongDot ? 2 * dotSize : dotSize
        drawDot(patternCtx, centerX, centerY, size)
      }
    }
  }

  return patternCtx.createPattern(patternCanvas, 'repeat')
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lineWidth: number,
): void {
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function createGridPattern(xSpacing: number, ySpacing: number, background: Background): CanvasPattern | null {
  const lineSize = 1

  const width = xSpacing * background.subdivisionStep
  const height = ySpacing * background.subdivisionStep

  patternCanvas.width = width
  patternCanvas.height = height

  const patternCtx = patternCanvas.getContext('2d')
  if (!patternCtx) return null

  // Clear the canvas
  patternCtx.clearRect(0, 0, width, height)
  patternCtx.strokeStyle = background.strokeColor

  if (background.subdivisionStep === 1) {
    // Draw main grid lines
    drawLine(patternCtx, 0, 0, width, 0, lineSize)
    drawLine(patternCtx, 0, 0, 0, height, lineSize)
  } else {
    const cellWidth = width / background.subdivisionStep
    const cellHeight = height / background.subdivisionStep

    for (let x = 0; x <= background.subdivisionStep; x++) {
      const posX = x * cellWidth
      const isStrongLine = x % background.subdivisionStep === 0
      drawLine(patternCtx, posX, 0, posX, height, isStrongLine ? 3 * lineSize : lineSize)
    }

    for (let y = 0; y <= background.subdivisionStep; y++) {
      const posY = y * cellHeight
      const isStrongLine = y % background.subdivisionStep === 0
      drawLine(patternCtx, 0, posY, width, posY, isStrongLine ? 3 * lineSize : lineSize)
    }
  }

  return patternCtx.createPattern(patternCanvas, 'repeat')
}

export class RenderBackground extends BaseSystem {
  private readonly cameras = this.query((q) => q.changed.with(Camera).trackWrites)

  private readonly grids = this.query((q) => q.changed.with(Grid).trackWrites)

  private readonly backgrounds = this.query((q) => q.changed.with(Background).trackWrites)

  private readonly screens = this.query((q) => q.changed.with(Screen).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderHtml))
  }

  public execute(): void {
    if (
      this.frame.value === 1 ||
      this.cameras.changed.length > 0 ||
      this.grids.changed.length > 0 ||
      this.backgrounds.changed.length > 0 ||
      this.screens.changed.length > 0
    ) {
      this.renderBackground()
    }
  }

  private renderBackground(): void {
    const ctx = this.resources.backgroundCanvas.getContext('2d')
    if (!ctx) return

    const { width, height } = this.screen

    // Resize the canvas to match screen dimensions
    this.resources.backgroundCanvas.width = width
    this.resources.backgroundCanvas.height = height

    ctx.clearRect(0, 0, width, height)

    // fill the background
    ctx.fillStyle = this.background.color
    ctx.fillRect(0, 0, width, height)

    if (this.background.kind === 'dots') {
      this.renderDots(ctx)
    } else if (this.background.kind === 'grid') {
      this.renderGrid(ctx)
    }
  }

  private renderDots(ctx: CanvasRenderingContext2D): void {
    let { xSpacing, ySpacing } = this.grid
    const step = this.background.subdivisionStep

    const w = this.screen.width
    const h = this.screen.height

    const left = this.camera.left
    const top = this.camera.top
    const right = left + w / this.camera.zoom
    const bottom = top + h / this.camera.zoom

    let patternWidth = xSpacing * step
    let patternHeight = ySpacing * step
    let startX = 0
    let startY = 0
    let numRows = Number.POSITIVE_INFINITY
    let numCols = Number.POSITIVE_INFINITY

    while (true) {
      patternWidth = step * xSpacing
      patternHeight = step * ySpacing
      startX = Math.floor(left / patternWidth) * patternWidth
      startY = Math.floor(top / patternHeight) * patternHeight
      const endX = Math.ceil(right / patternWidth) * patternWidth
      const endY = Math.ceil(bottom / patternHeight) * patternHeight
      numCols = Math.round((endX - startX) / xSpacing)
      numRows = Math.round((endY - startY) / ySpacing)

      if (Math.max(numCols, numRows) > 200) {
        xSpacing *= 2
        ySpacing *= 2
      } else {
        break
      }
    }

    const xSpacingCanvas = xSpacing * this.camera.zoom
    const ySpacingCanvas = ySpacing * this.camera.zoom

    const roundedX = Math.round(xSpacingCanvas)
    const roundedY = Math.round(ySpacingCanvas)

    const pattern = createDotPattern(roundedX, roundedY, this.background)
    if (!pattern) return

    pattern.setTransform(new DOMMatrix().scale(xSpacingCanvas / roundedX, ySpacingCanvas / roundedY))

    // Calculate pattern offset to align dot centers with grid intersection points
    const offsetX = (startX - left - xSpacing / 2) * this.camera.zoom
    const offsetY = (startY - top - ySpacing / 2) * this.camera.zoom

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w + patternWidth * this.camera.zoom, h + patternHeight * this.camera.zoom)
    ctx.restore()
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    let { xSpacing, ySpacing } = this.grid
    const step = this.background.subdivisionStep

    const w = this.screen.width
    const h = this.screen.height

    const left = this.camera.left
    const top = this.camera.top
    const right = left + w / this.camera.zoom
    const bottom = top + h / this.camera.zoom

    let patternWidth = xSpacing * step
    let patternHeight = ySpacing * step
    let startX = 0
    let startY = 0
    let numRows = Number.POSITIVE_INFINITY
    let numCols = Number.POSITIVE_INFINITY

    while (true) {
      patternWidth = step * xSpacing
      patternHeight = step * ySpacing
      startX = Math.floor(left / patternWidth) * patternWidth
      startY = Math.floor(top / patternHeight) * patternHeight
      const endX = Math.ceil(right / patternWidth) * patternWidth
      const endY = Math.ceil(bottom / patternHeight) * patternHeight
      numCols = Math.round((endX - startX) / xSpacing)
      numRows = Math.round((endY - startY) / ySpacing)

      if (Math.max(numCols, numRows) > 200) {
        xSpacing *= 2
        ySpacing *= 2
      } else {
        break
      }
    }

    const xSpacingCanvas = xSpacing * this.camera.zoom
    const ySpacingCanvas = ySpacing * this.camera.zoom

    const roundedX = Math.round(xSpacingCanvas)
    const roundedY = Math.round(ySpacingCanvas)

    const pattern = createGridPattern(roundedX, roundedY, this.background)
    if (!pattern) return

    pattern.setTransform(new DOMMatrix().scale(xSpacingCanvas / roundedX, ySpacingCanvas / roundedY))

    // Calculate pattern offset to align grid lines with grid intersection points
    const offsetX = (startX - left) * this.camera.zoom
    const offsetY = (startY - top) * this.camera.zoom

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w + patternWidth * this.camera.zoom, h + patternHeight * this.camera.zoom)
    ctx.restore()
  }
}
