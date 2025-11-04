import { co } from '@lastolivegames/becsy';
import { ScrollDirection } from '@prisma/client';
import * as comps from '../components/index.js';
import BaseSystem from './Base.js';
import { getDefaultScale, updateScrollView } from './common.js';

interface TouchVelocityPoint {
  position: [number, number];
  time: number;
}

const VELOCITY_SAMPLE_INTERVAL_MS = 100; // ms to track for velocity
const MOMENTUM_FRICTION = 0.95; // Friction coefficient (0-1)
const MIN_VELOCITY_THRESHOLD = 0.5; // Minimum velocity to continue momentum

class ScrollHandler extends BaseSystem {
  private readonly view = this.singleton.write(comps.View);

  private readonly viewQuery = this.query((q) => q.current.with(comps.View).write);

  private readonly input = this.singleton.read(comps.Input);

  private readonly page = this.singleton.read(comps.Page);

  private readonly viewportScale = this.singleton.read(comps.ViewportScale);

  private readonly viewportScaleQuery = this.query(
    (q) => q.current.with(comps.ViewportScale).write,
  );

  private readonly scrollBounds = this.singleton.read(comps.ScrollBounds);

  private isMouseOnScrollbar = false;

  private isDraggingScrollbar = false;

  private isTouchScrolling = false;

  private touchVelocity: [number, number] = [0, 0];

  private touchPoints: TouchVelocityPoint[] = [];

  private lastTouch: [number, number] = [0, 0];

  @co private *touchMomentum(): Generator {
    // return;
    const parent = this.resources.container.parentElement;
    if (!parent) return;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const velocity =
        Math.abs(this.touchVelocity[0]) > Math.abs(this.touchVelocity[1])
          ? this.touchVelocity[0]
          : this.touchVelocity[1];

      if (Math.abs(velocity) <= MIN_VELOCITY_THRESHOLD || this.isTouchScrolling) {
        break;
      }

      this.touchVelocity[0] *= MOMENTUM_FRICTION;
      this.touchVelocity[1] *= MOMENTUM_FRICTION;

      this.view.previous = this.view.current;
      this.view.current -= velocity * this.delta;
      this.view.current = Math.max(0, this.view.current);
      this.view.target = this.view.current;

      // Update scroll position here, or it will be a whole frame behind
      this.scrollContainer(this.view.current);

      yield;
    }
  }

  public initialize(): void {
    const parent = this.resources.container.parentElement;
    if (!parent) return;

    // =====================================================
    // Detect if mouse is over scrollbar
    const mouseMoveFn = (e: MouseEvent): void => {
      const rect = parent.getBoundingClientRect();
      this.isMouseOnScrollbar = rect.right - e.clientX <= 20;
    };
    parent.addEventListener('mousemove', mouseMoveFn);
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('mousemove', mouseMoveFn);
    });

    // =====================================================
    // Track scrollbar dragging
    const mouseDownFn = (): void => {
      if (this.isMouseOnScrollbar) {
        this.isDraggingScrollbar = true;
      }
    };
    parent.addEventListener('mousedown', mouseDownFn);
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('mousedown', mouseDownFn);
    });

    // =====================================================
    const mouseUpFn = (): void => {
      this.isDraggingScrollbar = false;
    };
    window.addEventListener('mouseup', mouseUpFn);
    this.onDestroyCallbacks.push(() => {
      window.removeEventListener('mouseup', mouseUpFn);
    });

    // =====================================================
    // Handle scroll events
    const scrollFn = (): void => {
      if (this.isTouchScrolling) return;

      if (this.isDraggingScrollbar) {
        // Update view component with new scroll position
        this.view.previous = this.view.current;
        this.view.current = parent.scrollTop;
        this.view.target = this.view.current;
      } else {
        // If not dragging scrollbar, maintain programmatic scroll position
        this.scrollContainer(this.view.current);
      }
    };
    parent.addEventListener('scroll', scrollFn);
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('scroll', scrollFn);
    });

    // =====================================================
    // Mobile touch handling
    const touchStartFn = (e: TouchEvent): void => {
      this.isTouchScrolling = true;

      this.lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
      this.touchPoints = [];
    };
    parent.addEventListener('touchstart', touchStartFn, { passive: false });
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('touchstart', touchStartFn);
    });

    // =====================================================
    const touchCancelFn = (e: TouchEvent): void => {
      if (e.touches.length !== 0) return;

      this.isTouchScrolling = false;
    };
    parent.addEventListener('touchcancel', touchCancelFn);
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('touchcancel', touchCancelFn);
    });

    // =====================================================
    const touchEndFn = (e: TouchEvent): void => {
      if (e.touches.length !== 0) return;

      this.isTouchScrolling = false;

      // Calculate final velocity

      const now = Date.now();
      const recentPoints = this.touchPoints.filter(
        (point) => now - point.time <= VELOCITY_SAMPLE_INTERVAL_MS,
      );

      if (recentPoints.length < 2) return;

      const newest = recentPoints[recentPoints.length - 1];
      const oldest = recentPoints[0];
      const timeDiff = (newest.time - oldest.time) / 1000;
      const posDiff = [
        newest.position[0] - oldest.position[0],
        newest.position[1] - oldest.position[1],
      ];

      this.touchVelocity = [posDiff[0] / timeDiff, posDiff[1] / timeDiff];
      this.touchMomentum();
    };
    parent.addEventListener('touchend', touchEndFn);
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('touchend', touchEndFn);
    });

    // =====================================================
    const touchMoveFn = (e: TouchEvent): void => {
      e.preventDefault(); // Prevent default touch scrolling

      if (e.touches.length > 1) {
        this.isTouchScrolling = false;
        return;
      }

      const touch = [e.touches[0].clientX, e.touches[0].clientY] as [number, number];
      const touchDelta = [this.lastTouch[0] - touch[0], this.lastTouch[1] - touch[1]];
      this.lastTouch = touch;

      // Record touch point for velocity calculation
      this.touchPoints.push({
        position: touch,
        time: Date.now(),
      });

      // Trim old points
      const now = Date.now();
      this.touchPoints = this.touchPoints.filter(
        (point) => now - point.time <= VELOCITY_SAMPLE_INTERVAL_MS,
      );

      const recentPoints = this.touchPoints;
      if (recentPoints.length < 2) return;

      const newest = recentPoints[recentPoints.length - 1];
      const oldest = recentPoints[0];
      const posDiff = [
        newest.position[0] - oldest.position[0],
        newest.position[1] - oldest.position[1],
      ];

      const diff = Math.abs(posDiff[0]) > Math.abs(posDiff[1]) ? touchDelta[0] : touchDelta[1];

      this.view.previous = this.view.current;
      this.view.current = Math.max(0, this.view.current + diff);
      this.view.target = this.view.current;
    };
    parent.addEventListener('touchmove', touchMoveFn, { passive: false });
    this.onDestroyCallbacks.push(() => {
      parent.removeEventListener('touchmove', touchMoveFn);
    });
  }

  public execute(): void {
    const parent = this.resources.container.parentElement;
    if (!parent) return;

    if (this.input.resizedTrigger) {
      const scale = getDefaultScale(this.page, window.innerWidth, window.innerHeight);
      const viewportScale = this.viewportScaleQuery.current[0].write(comps.ViewportScale);
      viewportScale.value = scale;
      viewportScale.worldScreenHeight = window.innerHeight / scale;
      viewportScale.worldScreenWidth = window.innerWidth / scale;
    }

    const viewEntity = this.viewQuery.current[0];
    const current = updateScrollView(
      viewEntity,
      this.input.deltaY,
      this.delta,
      this.scrollBounds.max,
    );

    this.scrollContainer(current);
  }

  private scrollContainer(current: number): void {
    const parent = this.resources.container.parentElement;
    if (!parent) return;

    if (!this.isDraggingScrollbar) {
      if (this.page.scrollDirection === ScrollDirection.Horizontal) {
        this.resources.container.scrollLeft = current * this.viewportScale.value;
      } else {
        parent.scrollTop = current * this.viewportScale.value;
      }
    }
  }
}

export default ScrollHandler;
