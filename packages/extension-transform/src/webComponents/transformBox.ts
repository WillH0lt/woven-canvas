import { ICBaseMenuButton } from '@infinitecanvas/core/elements'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-transform-box')
export class TransformBoxElement extends ICBaseMenuButton {
  static styles = css`
    :host {
      position: relative;
      display: block;
    }

    div {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    /*
      We want a border that continues to get thinner as --ic-zoom increases.
      Browsers clamp outline/border widths to (roughly) a device pixel, so
      calc(2px / var(--ic-zoom)) stops visually shrinking past that point.

      Technique: draw a 2px border at a larger (zoom-scaled) size, then scale
      the whole rectangle back down with a transform. The transform happens
      after rasterization, so anti-aliasing produces a visually thinner line
      (appearing sub‑pixel) instead of clamping.
    */
    div::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      /* Expand the box by the zoom factor so after scaling back it aligns */
      width: calc(100% * var(--ic-zoom));
      height: calc(100% * var(--ic-zoom));
      box-sizing: border-box;
      border: 2px solid var(--ic-primary);
      /* Translate to center, then scale down inversely proportional to zoom */
      transform: translate(-50%, -50%) scale(calc(1 / var(--ic-zoom)));
      transform-origin: center center;
      pointer-events: none;
    }
  `

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-transform-box': TransformBoxElement
  }
}
