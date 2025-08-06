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
      color: var(--ic-gray-100);
      background-color: var(--ic-gray-700);
      border-radius: var(--ic-menu-border-radius);
    }

    .container *:first-child {
      border-top-left-radius: var(--ic-menu-border-radius);
      border-bottom-left-radius: var(--ic-menu-border-radius);
    }

    .container *:last-child {
      border-top-right-radius: var(--ic-menu-border-radius);
      border-bottom-right-radius: var(--ic-menu-border-radius);
    }

    .container * {
      width: 100%;
      height: 100%;
      transition-property: background-color;
      transition-timing-function: var(--ic-transition-timing-function);
      transition-duration: var(--ic-transition-duration);
    }

    .container *:hover:not([divider]) {
      background-color: var(--ic-gray-600);
    }

    .container *[menu-open] {
      background-color: var(--ic-gray-600);
    }

    #tooltip {
      display: none;
      width: max-content;
      position: absolute;
      top: 0;
      left: 0;
      background: var(--ic-gray-700);
      color: var(--ic-gray-100);
      font-weight: bold;
      padding: 5px 10px;
      border-radius: var(--ic-menu-tooltip-border-radius);
      font-size: 70%;
    }

    .menu {
      background-color: var(--ic-gray-700);
      border-radius: var(--ic-menu-border-radius);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
  `
