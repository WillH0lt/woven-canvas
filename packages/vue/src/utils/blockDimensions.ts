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

  const rect = element.getBoundingClientRect()

  // Convert viewport coordinates to container-relative coordinates BEFORE camera transform
  const containerLeft = screen.value.left
  const containerTop = screen.value.top
  const center = new DOMPoint(rect.left + rect.width / 2 - containerLeft, rect.top + rect.height / 2 - containerTop)

  const cameraZoom = camera.value.zoom

  const cameraMatrix = new DOMMatrix()
  cameraMatrix.translateSelf(-camera.value.left * cameraZoom, -camera.value.top * cameraZoom)
  cameraMatrix.scaleSelf(cameraZoom, cameraZoom)
  cameraMatrix.invertSelf()

  const worldCenter = cameraMatrix.transformPoint(center)

  // Fractional layout size. `offsetWidth`/`offsetHeight` are integer-rounded, but the
  // center above comes from a sub-pixel rect — mixing the two shifts the derived
  // left/top by up to ±0.5px on every re-measure, so a block would creep each time
  // formatting was applied. Computed style is unaffected by the rotate/zoom transforms.
  const computed = getComputedStyle(element)
  const width = parseFloat(computed.width) || element.offsetWidth
  const height = parseFloat(computed.height) || element.offsetHeight

  return {
    width,
    height,
    left: worldCenter.x - width / 2,
    top: worldCenter.y - height / 2,
  }
}
