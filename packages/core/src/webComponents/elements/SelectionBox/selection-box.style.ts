import { css } from 'lit'

export const style = css`
div {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background-color: #5865f222;
  border-style: solid;
  border-width: calc(3px / var(--ic-zoom));
  border-color: var(--ic-primary);
}
`
