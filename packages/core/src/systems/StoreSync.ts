import { type Entity, System } from '@lastolivegames/becsy'

import * as comps from '../components'
import type { CoreResources } from '../types'
import { CommandSpawner } from './CommandSpawner'

export class StoreSync extends System {
  // private readonly _commands = this.query((q) => q.with(comps.Command, comps.ToBeDeleted).write)

  private readonly storables = this.query(
    (q) => q.added.changed.removed.with(comps.Storable).usingAll.write.trackWrites,
  )

  private readonly resources!: CoreResources

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CommandSpawner))
  }

  public execute(): void {
    // if (this.storables.changed.length) {
    //   console.log('StoreSync: Changed storables', this.storables.changed.length)
    // }
    // for (const entity of this.storables.added) {
    //   console.log('StoreSync: Added entity')
    //   // const data = this.serializeEntity(entity)
    //   // store.setComponent
    //   // console.log('StoreSync: Added entity', JSON.stringify(data))
    //   this.syncEntity(entity)
    // }
    // for (const entity of this.storables.changed) {
    //   console.log('StoreSync: Changed entity')
    //   // const data = this.serializeEntity(entity)
    //   // console.log('StoreSync: Changed entity', JSON.stringify(data))
    //   this.syncEntity(entity)
    // }
  }

  private serializeEntity(entity: Entity): Record<string, any> {
    const data: Record<string, any> = {}

    const id = entity.read(comps.Storable).id
    data[id] = {}

    for (const comp of this.resources.store.storables) {
      if (!entity.has(comp)) {
        continue
      }
      const c = entity.read(comp)
      data[id][comp.name] = c.toModel()
    }

    return data
  }

  private syncEntity(entity: Entity): void {
    const id = entity.read(comps.Storable).id

    for (const comp of this.resources.store.storables) {
      if (!entity.has(comp)) {
        continue
      }
      const c = entity.read(comp)
      this.resources.store.setComponent(id, comp.name, c.toModel())
    }
  }
}
