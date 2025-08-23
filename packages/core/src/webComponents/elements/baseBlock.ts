import { LitElement, css } from 'lit'
import { property } from 'lit/decorators.js'

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
    :host([is-hovered])::after,
    :host([is-selected])::after {
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
}
