import { css } from 'lit'

export const style = css`
  .button {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    height: 40px;
    width: 40px;
    transition-property: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
    color: var(--ic-gray-600);
  }

  .button:hover:not([divider]) {
    background-color: var(--ic-gray-200);
  }

  .button.selected {
    background-color: var(--ic-primary);
    color: var(--ic-gray-200);
  }

  .button.selected:hover:not([divider]) {
    background-color: var(--ic-primary-light);
  }

  .button svg {
    width: 40%;
    overflow: visible;
  }
`
