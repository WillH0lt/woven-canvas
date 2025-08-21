import { property } from 'lit/decorators/property.js'

import type { Snapshot } from '../../History'
import { ICBaseBlock } from './baseBlock'

// calculate the unrotated dimensions of a rotated rectangle based on aabb
// https://math.stackexchange.com/questions/298299/finding-original-width-and-height-of-aabb
function getUnrotatedDimensions(
  aabbWidth: number,
  aabbHeight: number,
  angle: number,
): { width: number; height: number } {
  const c = Math.abs(Math.cos(angle))
  const s = Math.abs(Math.sin(angle))

  const A = aabbWidth
  const B = aabbHeight

  if (angle === 0) {
    return { width: A, height: B }
  }

  if (angle === Math.PI / 2) {
    return { width: B, height: A }
  }

  const b = (B - (s / c) * A) / (c - (s * s) / c)
  const a = A / c - (b * s) / c

  return { width: a, height: b }
}

export abstract class ICEditableBlock extends ICBaseBlock {
  @property({ type: Boolean, attribute: 'is-editing' })
  isEditing = false

  public abstract getSnapshot(): Snapshot

  protected computeBlockDimensions(element: HTMLElement): { width: number; height: number; left: number; top: number } {
    const blockContainer = document.querySelector('#block-container') as HTMLElement
    const cameraTransform = window.getComputedStyle(blockContainer).transform
    const m = new DOMMatrix(cameraTransform)
    m.invertSelf()

    const rect = element.getBoundingClientRect()
    const center = new DOMPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    const worldCenter = m.transformPoint(center)

    const transform = window.getComputedStyle(this).transform
    const m2 = new DOMMatrix(transform)
    const rotateZ = Math.atan2(m2.b, m2.a)

    const topLeft = m.transformPoint(new DOMPoint(rect.left, rect.top))
    const bottomRight = m.transformPoint(new DOMPoint(rect.right, rect.bottom))
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

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties)

    if (changedProperties.has('isEditing')) {
      if (this.isEditing) {
        this.isSelected = false
        this.isHovered = false
      }
    }
  }
}
