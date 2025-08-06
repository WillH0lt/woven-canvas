import { css } from 'lit'

export const style = css`
  #slider {
    width: 100%;
    height: 4px;
    background-color: var(--ic-gray-300);
    border-radius: 8px;
    appearance: none;
    cursor: pointer;
    &:focus {
      outline-style: none;
    }
  }


  #slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: var(--ic-primary);
    cursor: pointer;
    transition-property: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
  }

  #slider::-webkit-slider-thumb:hover {
    background: var(--ic-primary-light);
  }

  /* All the same stuff for Firefox */
  #slider::-moz-range-thumb {
    -moz-appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: var(--ic-primary);
    cursor: pointer;
    transition-property: background-color;
    transition-timing-function: var(--ic-transition-timing-function);
    transition-duration: var(--ic-transition-duration);
  }

  #slider::-moz-range-thumb:hover {
    background: var(--ic-primary-light);
  }

`
