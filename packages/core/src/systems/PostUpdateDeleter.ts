import { BaseSystem } from '../BaseSystem.js'
import { ToBeDeleted } from '../components/index.js'

export class PostUpdateDeleter extends BaseSystem {
  // Note the usingAll.write below, which grants write entitlements on all component types.
  private readonly entities = this.query((q) => q.current.with(ToBeDeleted).usingAll.write)

  public execute(): void {
    for (const entity of this.entities.current) {
      // this.cleanUpConnectors(entity)
      entity.delete()
    }
  }

  // private cleanUpConnectors(entity: Entity): void {
  //   if (!entity.has(Block)) return

  //   const block = entity.read(Block)
  //   for (const connectorEntity of block.connectors) {
  //     if (!connectorEntity.has(Connector)) continue
  //     const connector = connectorEntity.write(Connector)
  //     if (connector.startBlockId === block.id) {
  //       connector.startBlockId = ''
  //     }

  //     if (connector.endBlockId === block.id) {
  //       connector.endBlockId = ''
  //     }
  //   }
  // }
}
