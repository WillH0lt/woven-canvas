import { BaseSystem, type Diff, type State } from '@infinitecanvas/core'
import { co } from '@lastolivegames/becsy'

import type { LocalStorageResources } from '../types'

export class PreInputLocalDB extends BaseSystem {
  protected declare readonly resources: LocalStorageResources

  public lastSyncedState: State | null = null

  public initialize(): void {
    this.syncInterval()
  }

  @co private *syncInterval(): Generator {
    yield co.waitForFrames(1)

    this.lastSyncedState = this.resources.history.getState()

    while (true) {
      yield co.waitForSeconds(5)
      if (!this.resources.history.isClean) continue

      const diff = this.resources.history.computeDiff(this.lastSyncedState ?? {})

      if (diff.isEmpty) continue

      this.syncLocalDB(diff)
      this.lastSyncedState = this.resources.history.getState()
    }
  }

  private syncLocalDB(diff: Diff): void {
    const localDB = this.resources.localDB

    // added components
    for (const [id, components] of Object.entries(diff.added)) {
      for (const [componentName, model] of Object.entries(components)) {
        localDB.put(id, componentName, model)
      }
    }

    // changed components
    for (const [id, components] of Object.entries(diff.changedTo)) {
      for (const [componentName, model] of Object.entries(components)) {
        localDB.put(id, componentName, model)
      }
    }

    // removed components
    for (const [id, components] of Object.entries(diff.removed)) {
      for (const componentName of Object.keys(components)) {
        localDB.delete(id, componentName)
      }
    }
  }
}
