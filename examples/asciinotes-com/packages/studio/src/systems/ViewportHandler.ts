import { ScrollDirection } from '@prisma/client';
import { primaryInput } from 'detect-it';

import * as comps from '../components/index.js';
import { MAX_ZOOM, MIN_ZOOM } from '../constants.js';
import { PointerAction, WheelAction } from '../types.js';
import BaseSystem from './Base.js';
import { clamp, updateBufferZone, updateRail, updateScrollView } from './common.js';
import EffectHandler from './EffectHandler.js';
import InputReader from './InputReader.js';

class ViewportHandler extends BaseSystem {
  private readonly input = this.singleton.read(comps.Input);

  private readonly page = this.singleton.read(comps.Page);

  private readonly pages = this.query((q) => q.addedOrChanged.with(comps.Page).write.trackWrites);

  private readonly inputSettings = this.singleton.read(comps.InputSettings);

  private readonly inputSettingsQuery = this.query(
    (q) => q.addedOrChanged.with(comps.InputSettings).trackWrites,
  );

  private readonly viewportScale = this.singleton.read(comps.ViewportScale);

  private readonly viewportScaleQuery = this.query(
    (q) => q.current.and.addedOrChanged.with(comps.ViewportScale).write.trackWrites,
  );

  private readonly view = this.singleton.write(comps.View);

  private readonly viewQuery = this.query((q) => q.current.with(comps.View).write);

  private readonly scrollBounds = this.singleton.read(comps.ScrollBounds);

  private readonly scrollBoundsQuery = this.query(
    (q) => q.current.and.addedOrChanged.with(comps.ScrollBounds).write.trackWrites,
  );

  private readonly dragged = this.query(
    (q) => q.current.and.added.and.removed.with(comps.Dragged).write,
  );

  private readonly selectionBoxes = this.query(
    (q) => q.added.and.removed.and.current.with(comps.SelectionBox).write,
  );

  private readonly bufferZones = this.query(
    (q) => q.current.with(comps.BufferZone).using(comps.Part).write,
  );

  private readonly rails = this.query((q) => q.current.with(comps.Rail));

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(InputReader, EffectHandler));
  }

  public initialize(): void {
    this.resources.viewport?.on('moved', () => {
      const viewport = this.resources.viewport;
      if (!viewport) return;

      this.view.previous = this.view.current;

      if (this.page.scrollDirection === ScrollDirection.Horizontal) {
        this.view.current = -viewport.position.x / viewport.scale.x;
      } else {
        this.view.current = -viewport.position.y / viewport.scale.y;
      }

      this.view.target = this.view.current;
    });

    this.resources.viewport?.on('zoomed', () => {
      const viewport = this.resources.viewport;
      if (!viewport) return;
      const viewportScale = this.viewportScaleQuery.current[0].write(comps.ViewportScale);
      // viewportScale.value = viewport.scale.y;
      viewportScale.worldScreenHeight = viewport.worldScreenHeight;
      viewportScale.worldScreenWidth = viewport.worldScreenWidth;
    });

    // this.resources.viewport?.on('wheel', (e) => {
    //   if (!this.resources.viewport) return;
    //   this.input.deltaY = e.deltaY;
    // });
  }

  public execute(): void {
    const { app, viewport, tileContainer, container } = this.resources;
    if (!app || !viewport || !tileContainer) {
      console.warn('missing resources');
      return;
    }

    if (this.input.resizedTrigger) {
      const dx = container.clientWidth - app.renderer.width;
      const dy = container.clientHeight - app.renderer.height;

      app.renderer.resize(container.clientWidth, container.clientHeight);
      viewport.resize(container.clientWidth, container.clientHeight);

      viewport.position.x += dx / 2;
      viewport.position.y += dy / 2;

      const viewportScale = this.viewportScaleQuery.current[0].write(comps.ViewportScale);
      viewportScale.worldScreenWidth = viewport.worldScreenWidth;
      viewportScale.worldScreenHeight = viewport.worldScreenHeight;
    }

    if (
      this.inputSettingsQuery.addedOrChanged.length ||
      this.pages.addedOrChanged.length ||
      this.dragged.added.length ||
      this.dragged.removed.length ||
      this.selectionBoxes.added.length ||
      this.selectionBoxes.removed.length ||
      this.input.modDownTrigger ||
      this.input.modUpTrigger
    ) {
      this.updateControls();
    }

    if (this.scrollBoundsQuery.addedOrChanged.length || this.pages.addedOrChanged.length) {
      this.updateScenery();
    }

    // =================================
    // render

    if (this.inputSettings.actionWheel === WheelAction.Scroll) {
      const viewEntity = this.viewQuery.current[0];
      const current = updateScrollView(
        viewEntity,
        this.input.deltaY,
        this.delta,
        this.scrollBounds.max,
      );

      const p = -1 * (this.resources.viewport?.scale.y ?? 1) * current;
      if (this.page.scrollDirection === ScrollDirection.Horizontal) {
        viewport.position.x = p;
      } else {
        viewport.position.y = p;
      }
    }

    this.keepInBounds();

    viewport.update(this.delta);

    app.renderer.render(app.stage);

    const m = viewport.localTransform;
    const cssMatrix = `matrix(${+m.a.toFixed(5)}, ${+m.b.toFixed(5)}, ${+m.c.toFixed(5)}, ${+m.d.toFixed(5)}, ${+m.tx.toFixed(2)}, ${+m.ty.toFixed(2)})`;
    const viewportDidChange = container.style.transform !== cssMatrix;
    if (viewportDidChange) {
      container.style.transform = cssMatrix;
    }
  }

  private keepInBounds(): void {
    if (!this.resources.viewport) return;

    const { viewport } = this.resources;

    const min = -1 * viewport.scale.y * this.scrollBounds.max;

    if (this.page.scrollDirection === ScrollDirection.Horizontal) {
      viewport.position.x = clamp(viewport.position.x, min, 0);
    } else {
      viewport.position.y = clamp(viewport.position.y, min, 0);
    }
  }

  private updateControls(): void {
    const { viewport } = this.resources;
    if (!viewport) return;

    const settings = this.inputSettings;

    viewport.plugins.removeAll();

    const mouseButtons = [];
    if (settings.actionLeftMouse === PointerAction.Pan) {
      mouseButtons.push('left');
    }
    if (settings.actionMiddleMouse === PointerAction.Pan) {
      mouseButtons.push('middle');
    }
    if (settings.actionRightMouse === PointerAction.Pan) {
      mouseButtons.push('right');
    }

    let dragEnabled = true;
    if (primaryInput === 'mouse') {
      dragEnabled = mouseButtons.length > 0;
    } else {
      dragEnabled =
        settings.actionLeftMouse === PointerAction.Pan ||
        settings.actionLeftMouse === PointerAction.TouchOnlyPan;
    }

    let direction = 'all';
    if (settings.actionLeftMouse === PointerAction.TouchOnlyPan) {
      direction = this.page.scrollDirection === ScrollDirection.Horizontal ? 'x' : 'y';
    }

    viewport.drag({
      mouseButtons: mouseButtons.join('|'),
      factor: Number(dragEnabled),

      direction,
      wheel: false,
    });

    const actionWheel = this.input.modDown ? settings.actionModWheel : settings.actionWheel;

    viewport.wheel({
      smooth: 8,
      wheelZoom: actionWheel === WheelAction.Zoom,
    });

    if (this.dragged.current.length || this.selectionBoxes.current.length) {
      const mouseEdges = {
        speed: 8,
        allowButtons: true,
      };
      if (this.page.scrollDirection === ScrollDirection.Horizontal) {
        viewport.mouseEdges({
          ...mouseEdges,
          left: 40,
          right: 40,
        });
      } else {
        viewport.mouseEdges({
          ...mouseEdges,
          top: 40,
          bottom: 40,
        });
      }
    }

    viewport
      .pinch()
      .decelerate({
        friction: 0.95,
        minSpeed: 0.5,
      })
      .clampZoom({
        minScale: MIN_ZOOM,
        maxScale: MAX_ZOOM,
      });
  }

  private updateScenery(): void {
    const worldScreenSize =
      this.page.scrollDirection === ScrollDirection.Horizontal
        ? this.viewportScale.worldScreenWidth
        : this.viewportScale.worldScreenHeight;

    const size = Math.max(this.scrollBounds.worldSize, worldScreenSize / 2);

    for (const bufferZoneEntity of this.bufferZones.current) {
      updateBufferZone(bufferZoneEntity, size, this.page.scrollDirection);
    }

    for (const railEntity of this.rails.current) {
      updateRail(railEntity, this.page, size);
    }
  }
}

export default ViewportHandler;
