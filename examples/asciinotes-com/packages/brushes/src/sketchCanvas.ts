// eslint-disable-next-line import/no-extraneous-dependencies
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Pane } from 'tweakpane';

import type { BaseBrush } from './brushes/index.js';
import { CrayonBrush, MarkerBrush, PaintBrush } from './brushes/index.js';
import { BrushKinds } from './brushes/types.js';
import { hexToRgba } from './utils.js';

async function setupSketchCanvas(element: HTMLElement): Promise<void> {
  // ===========================================================
  // create PIXI application

  const app = new PIXI.Application();

  await app.init();

  app.canvas.classList.add('sketch-canvas');

  element.appendChild(app.canvas);

  app.canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  const width = app.canvas.clientWidth;
  const height = app.canvas.clientHeight;

  app.renderer.resize(width, height);

  // ===========================================================
  // create Viewport

  const viewport = new Viewport({
    events: app.renderer.events,
  });

  viewport
    .drag({
      mouseButtons: 'right',
    })
    .wheel()
    .decelerate();

  viewport.setZoom(1, true);

  viewport.moveCenter(width / 2, height / 2);

  app.stage.addChild(viewport);

  // ===========================================================
  // setup drawing surface

  const texture = PIXI.RenderTexture.create({
    width: 1260,
    height: 1000,
  });

  const white = new PIXI.Sprite(PIXI.Texture.WHITE);
  white.tint = 0xc2bcb0;
  white.width = texture.width;
  white.height = texture.height;

  app.renderer.render({
    container: white,
    target: texture,
    clear: true,
  });

  const sprite = new PIXI.Sprite(texture);
  viewport.addChild(sprite);

  // ===========================================================
  // initialize brushes

  const brushes = new Map<BrushKinds, BaseBrush>();
  brushes.set(BrushKinds.Crayon, new CrayonBrush(app));
  brushes.set(BrushKinds.Marker, new MarkerBrush(app));
  brushes.set(BrushKinds.Paint, new PaintBrush(app));

  await Promise.all(Array.from(brushes.values()).map(async (brush) => brush.init()));

  // ===========================================================
  // create controls ui

  const brushParams = {
    kind: BrushKinds.Crayon,
    color: '#ff0000ff',
    size: 30,
  };

  const pane = new Pane();

  pane.addBinding(brushParams, 'kind', {
    view: 'list',
    label: 'brush',
    options: [
      { text: 'Crayon', value: BrushKinds.Crayon },
      { text: 'Marker', value: BrushKinds.Marker },
      { text: 'Paint', value: BrushKinds.Paint },
    ],
  });

  pane.addBinding(brushParams, 'color');
  pane.addBinding(brushParams, 'size', {
    min: 1,
    max: 100,
  });

  const clearBtn = pane.addButton({
    title: 'Clear',
  });

  clearBtn.on('click', () => {
    app.renderer.render({
      container: white,
      target: texture,
      clear: true,
    });
  });

  const downloadBtn = pane.addButton({
    title: 'Download',
  });

  async function download(): Promise<void> {
    const img = await app.renderer.extract.image(texture);
    const url = img.src;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.png';
    a.click();
  }

  downloadBtn.on('click', () => {
    download().catch((err: unknown) => {
      console.error(err);
    });
  });

  // ===========================================================
  // handle drawing

  let pointerDown = false;
  let last: PIXI.Point | null = null;
  let runningLength = 0;

  viewport.on('pointerdown', (ev: PointerEvent) => {
    if (ev.button !== 0) return;
    pointerDown = true;
  });

  viewport.on('pointermove', (event) => {
    if (!pointerDown) return;

    const curr = viewport.toLocal(event.global);

    if (!last) {
      last = curr;
      return;
    }

    const dx = curr.x - last.x;
    const dy = curr.y - last.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    runningLength += length;

    const [red, green, blue, alpha] = hexToRgba(brushParams.color);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const brush = brushes.get(brushParams.kind)!;

    brush.draw(
      {
        tileX: sprite.x,
        tileY: sprite.y,
        startX: last.x,
        startY: last.y,
        endX: curr.x,
        endY: curr.y,
        red,
        green,
        blue,
        alpha,
        size: brushParams.size,
        kind: brushParams.kind,
        runningLength,
      },
      texture,
    );

    last = curr;
  });

  viewport.on('pointerup', (ev: PointerEvent) => {
    if (ev.button !== 0) return;
    last = null;
    pointerDown = false;
    runningLength = 0;
  });
}

export default setupSketchCanvas;
