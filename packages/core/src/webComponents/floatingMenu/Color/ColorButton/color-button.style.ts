import { css } from 'lit'

export const style = css`
  .button {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 8px;
    margin-left: 4px;
  }
  .circle {
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    outline-style: solid;
    outline-width: 1px;
    outline-color: #ffffff55;
  }
  
  .chevron-down {
    width: 8px !important;
    margin-bottom: 2px;
    color: var(--ic-gray-300);
  }
  #color-menu {
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
`
