import { World as BecsyWorld, System } from '@lastolivegames/becsy';
import { ScrollDirection } from '@prisma/client';
import { Emitter } from 'strict-event-emitter';

import * as comps from './components/index.js';
import { createLayers, getDefaultScale, updateState } from './systems/common.js';
import EffectHandler from './systems/EffectHandler.js';
import InputReader from './systems/InputReader.js';
import ScrollHandler from './systems/ScrollHandler.js';
import TransformHandler from './systems/TransformHandler.js';
import type { Events, StateDelta, StudioOptions } from './types.js';
import { defaultStateDelta } from './types.js';

export class Runner {
  private becsyWorld: BecsyWorld | null = null;

  private readonly emitter = new Emitter<Events>();

  public async initialize(container: HTMLElement, options: StudioOptions): Promise<void> {
    // =================================
    // system groups

    const resources = {
      resources: {
        container,
        emitter: this.emitter,
      },
    };

    const inputsGroup = System.group(InputReader, resources);
    const scrollGroup = System.group(ScrollHandler, resources);
    const viewportGroup = System.group(EffectHandler, resources);
    const renderGroup = System.group(TransformHandler, resources);

    inputsGroup.schedule((s) => s.before(scrollGroup));
    scrollGroup.schedule((s) => s.before(viewportGroup));
    viewportGroup.schedule((s) => s.before(renderGroup));

    // =================================
    // world

    this.becsyWorld = await BecsyWorld.create({
      maxLimboComponents: 512 * 512,
      defs: [inputsGroup, viewportGroup, renderGroup, scrollGroup],
    });
    this.becsyWorld.build((worldSys) => {
      if (!container.parentElement) {
        throw new Error('Container must have a parent element');
      }

      Object.assign(worldSys.singleton.write(comps.Page), options.page);

      const scale = getDefaultScale(
        worldSys.singleton.read(comps.Page),
        window.innerWidth,
        window.innerHeight,
      );
      Object.assign(worldSys.singleton.write(comps.ViewportScale), {
        relativeUnits: true,
        value: scale,
        worldScreenHeight: window.innerHeight,
        worldScreenWidth: window.innerWidth,
      });

      Object.assign(worldSys.singleton.write(comps.InputSettings), options.inputSettings);

      // const maxScrollBound =
      //   options.page.scrollDirection === ScrollDirection.Horizontal
      //     ? container.parentElement.clientWidth
      //     : container.parentElement.clientHeight;
      Object.assign(worldSys.singleton.write(comps.ScrollBounds), {
        min: 0,
        max: 1e6,
      });

      const current =
        options.page.scrollDirection === ScrollDirection.Horizontal
          ? container.parentElement.scrollLeft
          : container.parentElement.scrollTop;
      Object.assign(worldSys.singleton.write(comps.View), {
        current,
        previous: current,
        target: current,
        bufferEnd: false,
      });

      createLayers(worldSys, options.layers);

      const delta: StateDelta = {
        ...defaultStateDelta,
        addedGroups: options.groups,
        addedParts: options.blocks,
        addedEffects: options.effects,
      };

      updateState(worldSys, delta, [], [], [], [], undefined, undefined);
    });
  }

  public async destroy(): Promise<void> {
    await this.becsyWorld?.terminate();
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

  private loop(): void {
    if (!(this.becsyWorld?.alive ?? true)) return;

    requestAnimationFrame(() => {
      this.loop();
    });

    this.becsyWorld?.execute().catch((err: unknown) => {
      console.error(err);
    });
  }
}
