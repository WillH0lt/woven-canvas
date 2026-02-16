/**
 * Shared test utilities for the eraser plugin.
 */

import {
  Aabb,
  addComponent,
  Block,
  type Context,
  createEntity,
  HitGeometry,
  RankBounds,
  Synced,
} from '@infinitecanvas/core'

/**
 * Options for creating a test block.
 */
export interface CreateBlockOptions {
  position?: [number, number]
  size?: [number, number]
  rank?: string
  tag?: string
  rotateZ?: number
  synced?: boolean
  /** Capsules for hit geometry: [[ax, ay, bx, by, radius], ...] */
  hitCapsules?: number[][]
}

/**
 * Create a block entity for testing.
 * Returns the entity ID.
 */
export function createBlock(ctx: Context, options: CreateBlockOptions = {}): number {
  const {
    position = [100, 100],
    size = [100, 100],
    rank,
    tag = 'test-block',
    rotateZ = 0,
    synced = true,
    hitCapsules,
  } = options

  // Use provided rank or generate a new one
  const blockRank = rank ?? RankBounds.genNext(ctx)

  const entityId = createEntity(ctx)
  addComponent(ctx, entityId, Block, {
    position,
    size,
    rank: blockRank,
    tag,
    rotateZ,
  })
  addComponent(ctx, entityId, Aabb, {})
  // Compute actual AABB from block corners
  Aabb.expandByBlock(ctx, entityId, entityId)

  if (synced) {
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
  }

  if (hitCapsules && hitCapsules.length > 0) {
    const flatCapsules: number[] = []
    for (const capsule of hitCapsules) {
      flatCapsules.push(...capsule)
    }
    addComponent(ctx, entityId, HitGeometry, {
      hitCapsules: flatCapsules,
      capsuleCount: hitCapsules.length,
    })
  }

  return entityId
}

/**
 * Create a block with hit geometry matching its bounding box.
 * Creates a single capsule along the diagonal of the block.
 * HitGeometry uses UV coordinates (0-1 range relative to the block).
 */
export function createBlockWithDiagonalHitGeometry(
  ctx: Context,
  options: Omit<CreateBlockOptions, 'hitCapsules'> & { radius?: number } = {},
): number {
  const { position = [100, 100], size = [100, 100], radius = 5, ...rest } = options

  // Create diagonal capsule from top-left (0,0) to bottom-right (1,1) in UV space
  // The intersectCapsule function transforms these UV coordinates to world coordinates
  const capsule = [0, 0, 1, 1, radius]

  return createBlock(ctx, {
    ...rest,
    position,
    size,
    hitCapsules: [capsule],
  })
}

/**
 * Create a block with hit geometry along its edges.
 * Creates capsules along each edge of the block.
 * HitGeometry uses UV coordinates (0-1 range relative to the block).
 */
export function createBlockWithEdgeHitGeometry(
  ctx: Context,
  options: Omit<CreateBlockOptions, 'hitCapsules'> & { radius?: number } = {},
): number {
  const { position = [100, 100], size = [100, 100], radius = 2, ...rest } = options

  // Create capsules along each edge in UV coordinates (0-1 space)
  const capsules = [
    // Top edge
    [0, 0, 1, 0, radius],
    // Right edge
    [1, 0, 1, 1, radius],
    // Bottom edge
    [1, 1, 0, 1, radius],
    // Left edge
    [0, 1, 0, 0, radius],
  ]

  return createBlock(ctx, {
    ...rest,
    position,
    size,
    hitCapsules: capsules,
  })
}

export interface PointerEventOptions {
  shiftKey?: boolean
  altKey?: boolean
  button?: number
}

/**
 * Creates a pointer event simulator with tracked pointer IDs.
 */
export function createPointerSimulator() {
  let currentPointerId = 1

  return {
    reset() {
      currentPointerId = 1
    },

    get pointerId() {
      return currentPointerId
    },

    pointerDown(element: HTMLElement, x: number, y: number, options: PointerEventOptions = {}): void {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: 'mouse',
          pressure: 0.5,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        }),
      )
    },

    pointerUp(x: number, y: number, options: PointerEventOptions = {}): void {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: 'mouse',
          pressure: 0,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        }),
      )
      currentPointerId++
    },

    pointerMove(x: number, y: number, options: PointerEventOptions = {}): void {
      simulateMouseMove(x, y)
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: x,
          clientY: y,
          button: options.button ?? 0,
          pointerId: currentPointerId,
          pointerType: 'mouse',
          pressure: 0.5,
          shiftKey: options.shiftKey ?? false,
          altKey: options.altKey ?? false,
          bubbles: true,
        }),
      )
    },

    /**
     * Simulate a drag gesture from one point to another.
     */
    drag(element: HTMLElement, from: [number, number], to: [number, number], options: PointerEventOptions = {}): void {
      this.pointerDown(element, from[0], from[1], options)
      this.pointerMove(to[0], to[1], options)
      this.pointerUp(to[0], to[1], options)
    },
  }
}

/**
 * Simulate a mouse move event.
 */
export function simulateMouseMove(x: number, y: number): void {
  window.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  )
}

/**
 * Create a mock DOM element for tests with proper dimensions.
 */
export function createMockElement(): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', { value: 800 })
  Object.defineProperty(element, 'clientHeight', { value: 600 })
  element.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }) as DOMRect
  document.body.appendChild(element)
  return element
}

/**
 * Simulate pressing the Escape key.
 */
export function simulateEscape(element: HTMLElement): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      code: 'Escape',
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
    }),
  )
}
