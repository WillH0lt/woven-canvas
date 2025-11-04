import { co } from '@lastolivegames/becsy';

import * as comps from '../components/index.js';
import BaseSystem from './Base.js';
import { getNormalizedDeltaY } from './common.js';

class InputReader extends BaseSystem {
  private readonly input = this.singleton.write(comps.Input);

  private readonly inputSettings = this.singleton.read(comps.InputSettings);

  private readonly pointerIds = new Set<number>();

  private resized = false;

  @co private *setInputTriggers(triggerKeys: string[]): Generator {
    for (const triggerKey of triggerKeys) {
      Object.assign(this.input, { [triggerKey]: true });

      yield co.waitForFrames(1);

      Object.assign(this.input, { [triggerKey]: false });

      yield;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @co private *setValueDelayed(key: string, value: any, delay: number): Generator {
    yield co.waitForFrames(delay);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    Object.assign(this.input, { [key]: value });
  }

  public initialize(): void {
    const mouseLeaveFn = (): void => {
      this.input.pointerOver = false;
    };
    document.addEventListener('mouse-studio-leave', mouseLeaveFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('mouse-studio-leave', mouseLeaveFn);
    });

    const mouseEnterFn = (): void => {
      this.input.pointerOver = true;
    };
    document.addEventListener('mouse-studio-enter', mouseEnterFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('mouse-studio-enter', mouseEnterFn);
    });

    // ==========================================================================

    const pointerMoveFn = (e: PointerEvent): void => {
      this.input.pointerScreen = [e.clientX, e.clientY];
      this.input.pointer = this.toWorld(this.input.pointerScreen);

      if (this.input.pointerDown && !this.input.pointerDownTrigger) {
        this.input.travelDistance += Math.sqrt(e.movementX ** 2 + e.movementY ** 2);
      }

      if (this.input.pointerDown && this.input.travelDistance > 0 && !this.input.isDragging) {
        this.input.isDragging = true;
        this.setInputTriggers(['dragStartTrigger']);
      }
    };

    document.addEventListener('pointermove', pointerMoveFn, false);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('pointermove', pointerMoveFn);
    });

    this.resources.viewport?.on('moved', (e: { type: string }) => {
      if (e.type === 'mouse-edges' || e.type === 'wheel') {
        this.input.pointer = this.toWorld(this.input.pointerScreen);
      }
    });

    // ==========================================================================
    const pointerUpFn = (e: PointerEvent): void => {
      this.setInputTriggers(['pointerUpTrigger']);
      this.pointerIds.delete(e.pointerId);
      this.input.pointerDown = false;
      if (this.input.isDragging) {
        this.setInputTriggers(['dragStopTrigger']);
      }
      this.input.isDragging = false;
      this.setValueDelayed('travelDistance', 0, 1);
    };

    document.addEventListener('pointerup', pointerUpFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('pointerup', pointerUpFn);
    });

    // ==========================================================================
    const pointerDownFn = (e: PointerEvent): void => {
      if (e.button === 0) {
        this.input.pointerAction = this.inputSettings.actionLeftMouse;
      } else if (e.button === 1) {
        this.input.pointerAction = this.inputSettings.actionMiddleMouse;
      } else if (e.button === 2) {
        this.input.pointerAction = this.inputSettings.actionRightMouse;
      }

      this.pointerIds.add(e.pointerId);

      if (this.pointerIds.size > 1) {
        pointerUpFn({
          ...e,
          pointerId: -1,
        });
        return;
      }

      this.input.pointerDown = true;
      this.setInputTriggers(['pointerDownTrigger']);

      if (this.pointerIds.size === 1) {
        this.input.pointer = this.toWorld([e.clientX, e.clientY]);
        this.input.pointerDownLocation = this.input.pointer;
      }
    };

    document.addEventListener('pointerdown', pointerDownFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('pointerdown', pointerDownFn);
    });

    // ==========================================================================

    const doubleClickTriggerFn = (): void => {
      this.setInputTriggers(['doubleClickTrigger']);
    };

    document.addEventListener('dblclick', doubleClickTriggerFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('dblclick', doubleClickTriggerFn);
    });

    // ==========================================================================
    const pointerCancelFn = (e: PointerEvent): void => {
      e.preventDefault();
      pointerUpFn(e);
      console.log('CANCEL');
    };

    document.addEventListener('pointercancel', pointerCancelFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('pointercancel', pointerCancelFn);
    });

    // ==========================================================================
    const clickFn = (): void => {
      // e.preventDefault();
      if (this.input.travelDistance < 3) {
        this.setInputTriggers(['isClickedTrigger']);
      }
    };

    document.addEventListener('click', clickFn);
    this.onDestroyCallbacks.push(() => {
      document.removeEventListener('click', clickFn);
    });

    // ==========================================================================

    const wheelFn = (ev: WheelEvent): void => {
      // input.deltaY gets updated in the execute method
      // _deltaYRequest is to ensure that it gets updated only once per frame
      this.input._deltaYRequest = getNormalizedDeltaY(ev);
      this.input.pointer = this.toWorld(this.input.pointerScreen);

      if (this.input.modDown) {
        ev.preventDefault();
      }
    };
    window.addEventListener('wheel', wheelFn, { passive: false });
    this.onDestroyCallbacks.push(() => {
      window.removeEventListener('wheel', wheelFn);
    });

    // ==========================================================================
    const keyDownFn = (e: KeyboardEvent): void => {
      const key = `${e.key === ' ' ? 'space' : e.key.toLowerCase()}Down`;
      if (key in this.input) {
        if (this.input[key as keyof comps.Input] === false) {
          const triggerKey = `${key}Trigger`;
          this.setInputTriggers([triggerKey]);
        }

        Object.assign(this.input, { [key]: true });
      }

      const modDown = e.ctrlKey || e.metaKey;
      if (modDown && !this.input.modDown) {
        this.setInputTriggers(['modDownTrigger']);
      }
      this.input.modDown = modDown;

      if (e.key === 'z' && this.input.modDown) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', keyDownFn);
    this.onDestroyCallbacks.push(() => {
      window.removeEventListener('keydown', keyDownFn);
    });

    // ==========================================================================
    const keyUpFn = (e: KeyboardEvent): void => {
      const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
      const keyDown = `${key}Down`;
      if (keyDown in this.input) {
        if (this.input[key as keyof comps.Input] === true) {
          const triggerKey = `${key}UpTrigger`;
          this.setInputTriggers([triggerKey]);
        }

        Object.assign(this.input, { [keyDown]: false });
      }

      const modDown = e.ctrlKey || e.metaKey;
      if (!modDown && this.input.modDown) {
        this.setInputTriggers(['modUpTrigger']);
      }
      this.input.modDown = modDown;

      if (e.key === 'z' && this.input.modDown) {
        e.preventDefault();
      }
    };
    window.addEventListener('keyup', keyUpFn);
    this.onDestroyCallbacks.push(() => {
      window.removeEventListener('keyup', keyUpFn);
    });
    // ==========================================================================

    const resizeFn = (): void => {
      this.resized = true;
    };

    window.addEventListener('resize', resizeFn);
    this.onDestroyCallbacks.push(() => {
      window.removeEventListener('resize', resizeFn);
    });

    // observer resize on the container
    const resizeObserver = new ResizeObserver(resizeFn);

    resizeObserver.observe(this.resources.container);
  }

  public execute(): void {
    this.input.deltaY = this.input._deltaYRequest;
    this.input._deltaYRequest = 0;

    if (this.resized) {
      this.input.resizedTrigger = true;
      this.resized = false;
    } else {
      this.input.resizedTrigger = false;
    }
  }

  private toWorld(screenPoint: [number, number]): [number, number] {
    if (!this.resources.viewport) {
      return [0, 0];
    }

    const point = this.resources.viewport.toWorld(screenPoint[0], screenPoint[1]);
    return [point.x, point.y];
  }
}

export default InputReader;
