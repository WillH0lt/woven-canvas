import { co } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import * as comps from '../components/index'
import { type Command, type CoreResources, EmitterEventKind } from '../types'

export class PreInputCommandSpawner extends BaseSystem<Record<string, Array<unknown>>> {
  private readonly _commands = this.query((q) => q.current.with(comps.Command).write)

  protected declare readonly resources: CoreResources

  @co private *spawnCommand(command: Command): Generator {
    console.log('Spawning command:', command)
    const args = JSON.parse(command.payload)
    this.emitCommand(command.kind, ...args)
    yield
  }

  public initialize(): void {
    this.resources.emitter.on(EmitterEventKind.Command, this.spawnCommand.bind(this))
  }

  public execute(): void {
    // commands only exist for 1 frame
    for (const commandEntity of this._commands.current) {
      commandEntity.delete()
    }
  }
}
