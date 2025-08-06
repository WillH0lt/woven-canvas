import { css } from 'lit'

export const style = css`
  :host * {
    box-sizing: border-box;
  }

  #container {
    width: 100%;
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    aspect-ratio: 1 / 1;
    padding: 8px;
    border-radius: 8px;
    background-color: var(--ic-gray-500);
    cursor: pointer;
    transition: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
  }

  .button:hover {
    background-color: var(--ic-gray-400);
  }

  .button-selected {
    background-color: var(--ic-primary);
  }

  .button-selected:hover {
    background-color: var(--ic-primary-light);
  }

  .button svg {
    width: 16px;
    height: 16px;
  }
`
