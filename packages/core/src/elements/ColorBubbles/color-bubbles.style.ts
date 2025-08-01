import { css } from 'lit'

export const style = css`
  .container {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 8px;
    border-radius: var(--ic-menu-border-radius);
    justify-content: center;
    background-color: var(--ic-gray-700);
  }

  .color-bubble {
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    outline-style: solid;
    outline-width: 1px;
    outline-color: #ffffff55;
  }

  .color-bubble.selected {
    outline-width: 2px !important;
    outline-color: var(--ic-primary-color) !important;
    outline-offset: 2px !important;
  }

  .rainbow {
    background: radial-gradient(50% 50% at 50% 50%, #ffffff 0%, transparent 100%),
      conic-gradient(
        from 0deg at 50% 50%,
        red,
        #ffa800 47.73deg,
        #ff0 79.56deg,
        #0f0 121.33deg,
        #0ff 180.99deg,
        #00f 238.67deg,
        #f0f 294.36deg,
        red 360deg
      ),
      #c4c4c4;
  }
`
