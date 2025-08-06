import { css } from 'lit'

export const style = css`
  :host * {
    box-sizing: border-box;
  }

  #container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    color: var(--ic-gray-100);
  }
`
