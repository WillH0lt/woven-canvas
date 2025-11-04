import { System } from '@lastolivegames/becsy';

import * as comps from '../components/index.js';
import type { Events, Resources } from '../types.js';

// base class for all systems
class BaseSystem extends System {
  protected onDestroyCallbacks: (() => void)[] = [];

  protected readonly resources!: Resources;

  // @ts-ignore
  private readonly _toBeDeleted = this.query((q) => q.with(comps.ToBeDeleted).write);

  // @ts-ignore
  private readonly _snapshots = this.query(
    (q) => q.with(comps.Snapshot).write.and.with(comps.Undoable).write,
  );

  public finalize(): void {
    this.onDestroyCallbacks.forEach((cb) => {
      cb();
    });
  }

  protected createSnapshot(snapshot: Partial<comps.Snapshot> = {}): void {
    this.createEntity(comps.Snapshot, snapshot, comps.Undoable);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected registerEvent(event: keyof Events, callback: (...payload: any[]) => void): void {
    this.resources.emitter.on(event, callback);
    this.onDestroyCallbacks.push(() => this.resources.emitter.off(event, callback));
  }
}

export default BaseSystem;
