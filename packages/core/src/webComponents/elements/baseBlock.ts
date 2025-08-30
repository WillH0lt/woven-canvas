import { LitElement, css } from 'lit'
import { property } from 'lit/decorators.js'

// calculate the unrotated dimensions of a rotated rectangle based on aabb
// https://math.stackexchange.com/questions/298299/finding-original-width-and-height-of-aabb
function getUnrotatedDimensions(
  aabbWidth: number,
  aabbHeight: number,
  angle: number,
): { width: number; height: number } {
  if (angle === 0) {
    return { width: aabbWidth, height: aabbHeight }
  }

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

export class ICBaseBlock extends LitElement {
  static styles = [
    css`
    :host {
      position: relative;
      display: block;
    }

    /*
      Emulate a zoom-responsive outline using a transform‑scaled pseudo-element.
      Draw larger (multiplied by zoom) with normal border thickness; scale down by
      1 / var(--ic-zoom) so the apparent border, radius and offset shrink smoothly
      past the device pixel clamp.
      Final (after scale) target values:
        thickness = outline-width / zoom
        offset    = outline-offset / zoom
        radius    = border-radius / zoom
      Pre-scale we use the raw custom property values and add 2*offset to width/height.
    */
    :host([is-hovered]) > :first-child::after,
    :host([is-selected]) > :first-child::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: calc((100% * var(--ic-zoom)) + (2 * var(--ic-highlighted-block-outline-offset)));
      height: calc((100% * var(--ic-zoom)) + (2 * var(--ic-highlighted-block-outline-offset)));
      box-sizing: border-box;
      border: var(--ic-highlighted-block-outline-width) solid var(--ic-highlighted-block-outline-color);
      border-radius: var(--ic-highlighted-block-border-radius);
      transform: translate(-50%, -50%) scale(calc(1 / var(--ic-zoom)));
      transform-origin: center center;
      pointer-events: none;
    }
  `,
  ]

  @property()
  public blockId!: string

  @property({ type: Boolean, reflect: true, attribute: 'is-hovered' })
  public isHovered = false

  @property({ type: Boolean, reflect: true, attribute: 'is-selected' })
  public isSelected = false

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
}
