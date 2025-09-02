import { BaseSystem } from '../BaseSystem.js'
import * as comps from '../components/index.js'

export class PostUpdateDeleter extends BaseSystem {
  // Note the usingAll.write below, which grants write entitlements on all component types.
  private readonly entities = this.query((q) => q.current.with(comps.ToBeDeleted).usingAll.write)

  public execute(): void {
    for (const entity of this.entities.current) {
      entity.delete()
    }
  }
}
