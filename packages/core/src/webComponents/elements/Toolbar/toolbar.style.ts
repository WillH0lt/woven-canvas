import { css } from 'lit'

export const style = css`
  :host {
    display: block;
    position: absolute;
    pointer-events: auto;
  }

  .container {
    display: flex;
    gap: 8px;
    padding: 8px 10px;
    overflow: hidden;
    cursor: pointer;
    color: var(--ic-gray-100);
    background-color: var(--ic-gray-100);
    border-radius: 12px;
    box-shadow: 0px 0px .5px rgba(0, 0, 0, .18), 0px 3px 8px rgba(0, 0, 0, .1), 0px 1px 3px rgba(0, 0, 0, .1);
  }

  .container * {
    transition-property: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
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
