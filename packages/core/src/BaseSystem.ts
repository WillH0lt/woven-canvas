import { type Entity, System as becsySystem } from '@lastolivegames/becsy'

import * as comps from './components'
import type { CommandMap } from './types'

function isEntity(item: any): boolean {
  // Adjust this check based on the actual structure of your Entity objects
  return typeof item === 'object' && item.alive && typeof item.__id === 'number'
}

export class BaseSystem<Commands extends CommandMap = {}> extends becsySystem {
  private readonly _toBeDeleted = this.query((q) => q.with(comps.ToBeDeleted).write)

  private readonly _commands = this.query((q) => q.added.with(comps.Command).write.using(comps.CommandRef).write)

  private readonly _storables = this.query((q) => q.with(comps.Storable).write)

  private commandListeners: {
    [K in keyof Commands]?: ((...data: Commands[K]) => void)[]
  } = {}

  public execute(): void {
    this.executeCommands()
  }

  protected deleteEntity(entity: Entity): void {
    this.deleteEntities([entity])
  }

  protected deleteEntities(entities: readonly Entity[]): void {
    for (const entity of entities) {
      entity.add(comps.ToBeDeleted)
    }
  }

  protected emitCommand<CommandKind extends keyof Commands>(kind: CommandKind, ...data: Commands[CommandKind]): void {
    // scan data deeply and find values are entities, entities cant survive serialization, so we need to
    // store them as CommandRef entities, then map them back to the original entities when executing the command

    const entities = [] as Entity[]
    const payload = JSON.stringify(data, (_key, value) => {
      if (isEntity(value)) {
        entities.push(value)
        return { kind: 'EntityRef', index: entities.length - 1 }
      }
      return value
    })

    const command = this.createEntity(
      comps.Command,
      {
        kind,
        payload,
      },
      comps.ToBeDeleted,
    )

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      this.createEntity(comps.CommandRef, { index: i, entity, command }, comps.ToBeDeleted)
    }
  }

  protected addCommandListener<CommandKind extends keyof Commands>(
    kind: CommandKind,
    callback: (...data: Commands[CommandKind]) => void,
  ): void {
    if (!this.commandListeners[kind]) {
      this.commandListeners[kind] = []
    }
    this.commandListeners[kind]!.push(callback)
  }

  // protected runMachine(events: Array): void {
  //   const events = this.getCursorEvents()
  //   if (events.length === 0) return

  //   let state = this.cursorMachine.resolveState({
  //     value: this.cursorState.state,
  //     context: {
  //       tool: this.cursorState.tool,
  //       icon: this.cursorState.icon,
  //       iconRotation: this.cursorState.iconRotation,
  //       hoveredEntity: this.cursorState.hoveredEntity,
  //       heldBlock: this.cursorState.heldBlock,
  //     },
  //   })

  //   for (const event of events) {
  //     const result = transition(this.cursorMachine, state, event)
  //     state = result[0]

  //     for (const action of result[1]) {
  //       if (typeof action.exec === 'function') {
  //         action.exec(action.info, action.params)
  //       }
  //     }
  //   }

  //   // TODO this will maybe be handled in the store once we have a store
  //   if (this.cursorState.icon !== state.context.icon || this.cursorState.iconRotation !== state.context.iconRotation) {
  //     this.emitCommand(BlockCommand.SetCursor, state.context.icon, state.context.iconRotation)
  //   }

  //   Object.assign(this.cursorState, state.context)
  //   this.cursorState.state = state.value
  // }

  protected executeCommands(): void {
    for (const commandEntity of this._commands.added) {
      const command = commandEntity.read(comps.Command)
      const listeners = this.commandListeners[command.kind]

      if (listeners) {
        const data = this._parseCommandPayload(command)
        for (const listener of listeners) {
          listener(...data)
        }
      }
    }
  }

  protected getCommand<CommandKind extends keyof Commands>(kind: CommandKind): Commands[CommandKind] | undefined {
    for (const commandEntity of this._commands.added) {
      const command = commandEntity.read(comps.Command)
      if (command.kind === kind) {
        const data = this._parseCommandPayload(command)
        return data
      }
    }

    return undefined
  }

  private _parseCommandPayload(command: Readonly<comps.Command>): any {
    const refs = command.refs.map((ref) => ref.read(comps.CommandRef).entity)
    const data = JSON.parse(command.payload, (_key, value) => {
      if (value && typeof value === 'object' && value.kind === 'EntityRef') {
        return refs[value.index]
      }
      return value
    })

    return data
  }
}
