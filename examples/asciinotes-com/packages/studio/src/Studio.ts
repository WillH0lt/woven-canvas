import { World as BecsyWorld, System } from '@lastolivegames/becsy';
import { ScrollDirection } from '@prisma/client';
import type { BaseBrush, BrushKinds } from '@scrolly-page/brushes';
import { Brushes } from '@scrolly-page/brushes';
import { Viewport } from 'pixi-viewport';
import * as PIXI from 'pixi.js';
import { Emitter } from 'strict-event-emitter';

import * as comps from './components/index.js';
import { STUDIO_BRUSHES } from './constants.js';
import {
  createBufferZone,
  createLayers,
  createRail,
  createTile,
  getStateDelta,
  updateState,
} from './systems/common.js';
import * as sys from './systems/index.js';
import type { Events, StateDelta, StateSnapshot, StudioOptions } from './types.js';
import { BufferZoneKind, RailKind, defaultStateDelta } from './types.js';

export class Studio {
  public nextTick: Promise<void> = Promise.resolve();

  public currStateBlobUrl: string | null = null;

  public prevStateBlobUrl: string | null = null;

  public viewport: Viewport | null = null;

  public readonly emitter = new Emitter<Events>();

  private resolveNextTick: (() => void) | null = null;

  private becsyWorld: BecsyWorld | null = null;

  private readonly brushInstances = new Map<BrushKinds, BaseBrush>();

  private app: PIXI.Application | null = null;

  public async initialize(container: HTMLElement, options: StudioOptions): Promise<void> {
    // =================================
    // pixi app

    const app = new PIXI.Application();
    this.app = app;
    await app.init({
      autoStart: false,
      preference: 'webgl',
      backgroundAlpha: 0,
      premultipliedAlpha: true,
      width: container.clientWidth,
      // useBackBuffer: true,
    });
    app.renderer.canvas.id = 'drawing';
    app.renderer.canvas.removeAttribute('width');
    app.renderer.canvas.removeAttribute('height');
    app.renderer.canvas.style.position = 'absolute';
    app.renderer.canvas.style.top = '0';
    app.renderer.canvas.style.left = '0';
    app.renderer.canvas.style.width = '100%';
    app.renderer.canvas.style.height = '100%';
    app.renderer.canvas.style.pointerEvents = 'auto';

    app.renderer.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    if (!container.parentElement) {
      throw new Error('Container must be mounted');
    }
    container.parentElement.prepend(app.renderer.canvas);

    const viewport = new Viewport({
      events: app.renderer.events,
      screenWidth: container.clientWidth,
      screenHeight: container.clientHeight,
    });
    this.viewport = viewport;

    let position: PIXI.PointData = { x: 0, y: 0 };
    if (options.page.scrollDirection === ScrollDirection.Vertical) {
      position = { x: 0, y: container.clientHeight / 2 };
    } else {
      position = { x: container.clientWidth / 2, y: 0 };
    }
    this.viewport.moveCenter(position);

    app.stage.addChild(viewport);

    const tileContainer = new PIXI.Container();
    viewport.addChild(tileContainer);

    // PIXI.Assets.load('/img/dot.png')
    //   .then((res) => {
    //     const size = 1e5;
    //     const tilingSprite = new PIXI.TilingSprite({
    //       texture: res as PIXI.Texture,
    //       width: size,
    //       height: size,
    //     });
    //     tilingSprite.position.set(-size / 2, -size / 2);
    //     viewport.addChild(tilingSprite);
    //     // viewport.addChildAt(tileContainer, 1);
    //   })
    //   .catch((err: unknown) => {
    //     console.error(err);
    //   });

    app.renderer.resize(container.clientWidth, container.clientHeight);
    viewport.resize(container.clientWidth, container.clientHeight);

    viewport.on('zoomed', () => {
      // update --parts-zoom
      const zoom = viewport.scale.x;
      document.documentElement.style.setProperty('--parts-zoom', zoom.toString());
    });

    // =================================
    // load assets

    const promises = STUDIO_BRUSHES.map(async (kind) => this.loadBrush(kind));

    await Promise.all(promises);

    // =================================
    // events
    this.emitter.on('snapshot:move-state', (blobUrl: string) => {
      if (this.prevStateBlobUrl === null) {
        this.prevStateBlobUrl = blobUrl;
      }

      this.currStateBlobUrl = blobUrl;
    });

    // =================================
    // system groups

    const resources = {
      resources: {
        container,
        emitter: this.emitter,
        app: this.app,
        viewport: this.viewport,
        tileContainer,
        brushInstances: this.brushInstances,
      },
    };

    const inputsGroup = System.group(
      sys.InputReader,
      resources,
      sys.ViewportHandler,
      resources,
      sys.EventReceiver,
      resources,
      sys.EffectHandler,
      resources,
    );
    const controlsGroup = System.group(
      sys.SelectionHandler,
      resources,
      sys.EditHandler,
      resources,
      sys.SketchHandler,
      resources,
    );
    const transformGroup = System.group(sys.TransformHandler, resources);
    const renderGroup = System.group(sys.PartHandler, resources);
    const cleanupGroup = System.group(sys.Deleter, resources);
    const undoGroup = System.group(sys.UndoRedo, resources);

    const groups = [
      inputsGroup,
      controlsGroup,
      transformGroup,
      renderGroup,
      cleanupGroup,
      undoGroup,
    ];

    for (let i = 0; i < groups.length - 1; i++) {
      groups[i].schedule((s) => s.before(groups[i + 1]));
    }

    // =================================
    // world

    this.becsyWorld = await BecsyWorld.create({
      maxLimboComponents: 512 * 512,
      defs: groups,
    });
    this.becsyWorld.build((worldSys) => {
      Object.assign(worldSys.singleton.write(comps.Page), options.page);

      Object.assign(worldSys.singleton.write(comps.InputSettings), options.inputSettings);

      Object.assign(worldSys.singleton.write(comps.Brush), options.brush);

      Object.assign(worldSys.singleton.write(comps.ViewportScale), {
        value: 1,
        worldScreenHeight: container.clientHeight,
        worldScreenWidth: container.clientWidth,
      });

      Object.assign(worldSys.singleton.write(comps.View), {
        bufferEnd: true,
      });

      createLayers(worldSys, options.layers);

      createBufferZone(worldSys, BufferZoneKind.Negative, options.page.scrollDirection);
      createBufferZone(worldSys, BufferZoneKind.Positive, options.page.scrollDirection);

      if (options.page.minWidth !== 0) {
        createRail(worldSys, RailKind.MinPositive);
        createRail(worldSys, RailKind.MinNegative);
      }
      if (options.page.maxWidth !== 0) {
        createRail(worldSys, RailKind.MaxPositive);
        createRail(worldSys, RailKind.MaxNegative);
      }
      createRail(worldSys, RailKind.Center);

      // createRail(
      //   worldSys,
      //   RailKind.MaxPositive,
      //   options.page.maxWidth / 2,
      //   options.page.scrollDirection,
      // );
      // createRail(
      //   worldSys,
      //   RailKind.MaxNegative,
      //   options.page.maxWidth / 2,
      //   options.page.scrollDirection,
      // );

      const delta: StateDelta = {
        ...defaultStateDelta,
        addedGroups: options.groups,
        addedParts: options.blocks,
        addedEffects: options.effects,
      };

      updateState(worldSys, delta, [], [], [], [], app, tileContainer);

      for (const tile of options.tiles) {
        createTile(worldSys, app, tileContainer, tile);
      }
    });
  }

  public async destroy(): Promise<void> {
    await this.becsyWorld?.terminate();

    this.app?.destroy();
  }

  public start(): void {
    if (!this.becsyWorld) {
      throw new Error('World is not initialized');
    }

    this.loop();
  }

  public async execute(): Promise<void> {
    await this.becsyWorld?.execute();
  }

  public async updateStateAndGetDelta(): Promise<StateDelta | null> {
    if (this.currStateBlobUrl === null || this.prevStateBlobUrl === null) {
      throw new Error('No snapshot available');
    }

    if (this.currStateBlobUrl === this.prevStateBlobUrl) {
      return null;
    }

    const [prevState, currState] = await Promise.all(
      [this.prevStateBlobUrl, this.currStateBlobUrl].map(async (url) => {
        const res = await fetch(url);
        const state = (await res.json()) as StateSnapshot;
        return state;
      }),
    );
    const delta = getStateDelta(prevState, currState);

    const isEmpty = (Object.values(delta) as unknown as unknown[][]).every(
      (array) => array.length === 0,
    );

    this.prevStateBlobUrl = this.currStateBlobUrl;

    return isEmpty ? null : delta;
  }

  private loop(): void {
    if (!(this.becsyWorld?.alive ?? true)) return;

    requestAnimationFrame(() => {
      this.loop();
    });

    if (this.resolveNextTick) this.resolveNextTick();

    // Create a new nextTick promise for the next frame
    this.nextTick = new Promise((resolve) => {
      this.resolveNextTick = resolve;
    });

    this.becsyWorld?.execute().catch((err: unknown) => {
      console.error(err);
    });
  }

  private async loadBrush(kind: Exclude<BrushKinds, BrushKinds.None>): Promise<void> {
    if (!this.app) {
      throw new Error('App not initialized');
    }

    if (this.brushInstances.has(kind)) {
      throw new Error(`Brush of kind ${kind} already loaded`);
    }

    if (kind in Brushes) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const Brush = Brushes[kind] as new (app: PIXI.Application) => BaseBrush;
      const brush = new Brush(this.app);
      await brush.init();
      this.brushInstances.set(kind, brush);
    } else {
      throw new Error(`Brush of kind ${kind} not implemented`);
    }
  }
}
