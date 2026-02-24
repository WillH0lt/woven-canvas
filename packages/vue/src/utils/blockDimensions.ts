import type { Camera, InferCanvasComponentType, Screen } from '@woven-canvas/core'
import type { ShallowRef } from 'vue'

type CameraValue = InferCanvasComponentType<typeof Camera.schema>
type ScreenValue = InferCanvasComponentType<typeof Screen.schema>

export interface BlockDimensions {
  width: number
  height: number
  left: number
  top: number
}

/**
 * Calculate the unrotated dimensions of a rotated rectangle based on AABB
 * https://math.stackexchange.com/questions/298299/finding-original-width-and-height-of-aabb
 */
export function getUnrotatedDimensions(
  aabbWidth: number,
  aabbHeight: number,
  angle: number,
): { width: number; height: number } {
  if (angle === 0) {
    return { width: aabbWidth, height: aabbHeight }
  }

  if (Math.abs(angle - Math.PI / 2) < 0.0001) {
    return { width: aabbHeight, height: aabbWidth }
  }

  const c = Math.abs(Math.cos(angle))
  const s = Math.abs(Math.sin(angle))

  const height = (aabbHeight - (s / c) * aabbWidth) / (c - (s * s) / c)
  const width = aabbWidth / c - (height * s) / c

  return { width, height }
}

/**
 * Compute block dimensions from an element, accounting for rotation and camera transform.
 * Used to calculate correct position when text content changes on a rotated block.
 */
export function computeBlockDimensions(
  element: HTMLElement,
  camera: ShallowRef<CameraValue>,
  screen: ShallowRef<ScreenValue>,
): BlockDimensions {
  const blockElement = element.closest('.wov-block') as HTMLElement | null
  if (!blockElement) {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height, left: 0, top: 0 }
  }

  const transform = window.getComputedStyle(blockElement).transform
  const matrix = new DOMMatrix(transform)
  const rotateZ = Math.atan2(matrix.b, matrix.a)

  const rect = element.getBoundingClientRect()

  // Convert viewport coordinates to container-relative coordinates BEFORE camera transform
  const containerLeft = screen.value.left
  const containerTop = screen.value.top
  const center = new DOMPoint(rect.left + rect.width / 2 - containerLeft, rect.top + rect.height / 2 - containerTop)

  const cameraLeft = camera.value.left
  const cameraTop = camera.value.top
  const cameraZoom = camera.value.zoom

  const cameraMatrix = new DOMMatrix()
  cameraMatrix.translateSelf(-cameraLeft * cameraZoom, -cameraTop * cameraZoom)
  cameraMatrix.scaleSelf(cameraZoom, cameraZoom)
  cameraMatrix.invertSelf()

  const worldCenter = cameraMatrix.transformPoint(center)

  const topLeft = cameraMatrix.transformPoint(new DOMPoint(rect.left - containerLeft, rect.top - containerTop))
  const bottomRight = cameraMatrix.transformPoint(new DOMPoint(rect.right - containerLeft, rect.bottom - containerTop))
  const aabbWidth = bottomRight.x - topLeft.x
  const aabbHeight = bottomRight.y - topLeft.y

  const { width, height } = getUnrotatedDimensions(aabbWidth, aabbHeight, -rotateZ)

  return {
    width,
    height,
    left: worldCenter.x - width / 2,
    top: worldCenter.y - height / 2,
  }
}
