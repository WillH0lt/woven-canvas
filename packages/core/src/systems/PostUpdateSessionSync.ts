import type { Query } from '@lastolivegames/becsy'
import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import type { CoreCommandArgs } from '../commands'
import type { CoreResources } from '../types'
import { PostUpdateDeleter } from './PostUpdateDeleter'
import { PostUpdateHistory } from './PostUpdateHistory'

export class PostUpdateSessionSync extends BaseSystem<CoreCommandArgs> {
  private readonly addedOrChangedQueries = new Map<new () => BaseComponent, Query>()

  protected declare readonly resources: CoreResources

  public constructor() {
    super()

    this.schedule((s) => s.inAnyOrderWith(PostUpdateDeleter, PostUpdateHistory))

    const Singletons = ComponentRegistry.instance.singletons

    for (const Comp of Singletons) {
      const c = Comp.prototype.constructor as typeof BaseComponent
      const addToSession = c.persistent && c.singleton

      if (!addToSession) continue

      const added = this.query((q) => q.addedOrChanged.with(Comp).trackWrites)
      this.addedOrChangedQueries.set(Comp, added)
    }
  }

  public execute(): void {
    for (const Comp of this.addedOrChangedQueries.keys()) {
      const query = this.addedOrChangedQueries.get(Comp)!
      if (query.addedOrChanged.length === 0) continue

      const comp = query.addedOrChanged[0].read(Comp)
      this.resources.localDB.putSession(Comp.name, comp.toJson())
    }
  }
}
