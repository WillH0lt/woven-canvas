import { css } from 'lit'

export const style = css`
.container {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  height: 100%;
  width: 100%;
  font-size: 12px;
  line-height: 16px;
  transition: background-color 0.2s ease;
}

.inner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  width: 100%;
}

.container:hover .inner {
  border-color: var(--ic-gray-200);
}

.label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.chevron-icon {
  width: 8px;
  margin-left: auto;
  margin-bottom: 2px;
  color: var(--ic-gray-300);
}
`
