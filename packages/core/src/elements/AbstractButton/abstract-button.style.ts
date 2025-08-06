import { css } from 'lit'

export const style = css`
  .button {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    height: 100%;
    transition-property: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
  }

  .button.active {
    background-color: var(--ic-primary);
  }

  .button svg {
    width: 40%;
    overflow: visible;
  }
`
