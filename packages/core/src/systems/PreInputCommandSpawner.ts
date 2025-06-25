import { System, co } from '@lastolivegames/becsy'

import * as comps from '../components/index'
import { type Command, type CoreResources, EmitterEventKind } from '../types'

export class PreInputCommandSpawner extends System {
  private readonly _commands = this.query((q) => q.with(comps.Command, comps.ToBeDeleted).write)

  private readonly resources!: CoreResources

  @co private *spawnCommand(command: Command): Generator {
    this.createEntity(comps.Command, { ...command }, comps.ToBeDeleted)
    yield
  }

  public initialize(): void {
    this.resources.emitter.on(EmitterEventKind.Command, this.spawnCommand.bind(this))
  }
}
