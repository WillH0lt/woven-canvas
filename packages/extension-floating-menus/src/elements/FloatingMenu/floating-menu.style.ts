import { css } from 'lit'

export const style = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: auto;
    }

    .container {
      display: flex;
      overflow: hidden;
      cursor: pointer;
      height: 100%;
      color: var(--ic-floating-menus-gray-100);
      background-color: var(--ic-floating-menus-gray-700);
      border-radius: var(--ic-floating-menus-border-radius);
    }

    .container *:first-child {
      border-top-left-radius: var(--ic-floating-menus-border-radius);
      border-bottom-left-radius: var(--ic-floating-menus-border-radius);
    }

    .container *:last-child {
      border-top-right-radius: var(--ic-floating-menus-border-radius);
      border-bottom-right-radius: var(--ic-floating-menus-border-radius);
    }

    .container * {
      width: 100%;
      height: 100%;
      transition-property: background-color;
      transition-timing-function: var(--ic-floating-menus-transition-timing-function);
      transition-duration: var(--ic-floating-menus-transition-duration);
    }

    .container *:hover:not([divider]) {
      background-color: var(--ic-floating-menus-gray-600);
    }

    .container *[menu-open] {
      background-color: var(--ic-floating-menus-gray-600);
    }

    #tooltip {
      display: none;
      width: max-content;
      position: absolute;
      top: 0;
      left: 0;
      background: var(--ic-floating-menus-gray-700);
      color: var(--ic-floating-menus-gray-100);
      font-weight: bold;
      padding: 5px 10px;
      border-radius: var(--ic-floating-menus-tooltip-border-radius);
      font-size: 70%;
    }
  `
