import { css } from 'lit'

export const buttonStyles = css`
  .button {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    height: 100%;
    transition-property: background-color;
    transition-timing-function: var(--ic-floating-menus-transition-timing-function);
    transition-duration: var(--ic-floating-menus-transition-duration);
  }

  .button.active {
    background-color: var(--ic-floating-menus-primary-color);
  }

  .button > svg {
    width: 40%;
  }
`
