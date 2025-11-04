import setupSketchCanvas from './sketchCanvas.ts';
import './style.css';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-floating-promises
setupSketchCanvas(document.querySelector<HTMLElement>('#app')!);
