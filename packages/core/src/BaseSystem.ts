import { type Entity, type Query, System } from '@lastolivegames/becsy'
import { type AnyStateMachine, transition } from 'xstate'

import * as comps from './components'
import { distance } from './helpers'
import type { BaseResources, BlockDef, CommandMap, MouseEvent, PointerButton, PointerEvent } from './types'

const CLICK_MOVE_THRESHOLD = 1
const CLICK_FRAME_THRESHOLD = 60

function isEntity(item: any): boolean {
  // Adjust this check based on the actual structure of your Entity objects
  return typeof item === 'object' && item.alive && typeof item.__id === 'number'
}

export class BaseSystem<Commands extends CommandMap = {}> extends System {
  readonly #_toBeDeleted = this.query((q) => q.with(comps.ToBeDeleted).write)

  protected readonly resources!: BaseResources

  readonly #commands = this.query(
    (q) =>
      q.added
        .with(comps.Command)
        .write.orderBy((e) => e.ordinal)
        .using(comps.CommandRef).write,
  )

  protected readonly frame = this.singleton.read(comps.Frame)

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
      if (!entity.has(comps.ToBeDeleted)) entity.add(comps.ToBeDeleted)
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

    const command = this.createEntity(comps.Command, {
      kind,
      payload,
    })

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      this.createEntity(comps.CommandRef, { index: i, entity, command })
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

  protected executeCommands(): void {
    for (const commandEntity of this.#commands.added) {
      const command = commandEntity.read(comps.Command)
      const listeners = this.commandListeners[command.kind]

      if (listeners) {
        const data = this.#parseCommandPayload(command)
        for (const listener of listeners) {
          listener(...data)
        }
      }
    }
  }

  protected getCommand<CommandKind extends keyof Commands>(kind: CommandKind): Commands[CommandKind] | undefined {
    for (const commandEntity of this.#commands.added) {
      const command = commandEntity.read(comps.Command)
      if (command.kind === kind) {
        const data = this.#parseCommandPayload(command)
        return data
      }
    }

    return undefined
  }

  #parseCommandPayload(command: Readonly<comps.Command>): any {
    const refs = command.refs.map((ref) => ref.read(comps.CommandRef).entity)
    const data = JSON.parse(command.payload, (_key, value) => {
      if (value && typeof value === 'object' && value.kind === 'EntityRef') {
        return refs[value.index]
      }
      return value
    })

    return data
  }

  protected getBlockDef(tag: string): BlockDef | undefined {
    return this.resources.blockDefs[tag]
  }

  protected getBlockElementById(blockId: string): HTMLElement | null {
    return this.resources.blockContainer.querySelector<HTMLElement>(`[id='${blockId}']`)
  }

  protected getPointerEvents(
    pointers: Query,
    camera: Readonly<comps.Camera>,
    intersect: Readonly<comps.Intersect>,
    filters: {
      button?: PointerButton | undefined
    } = {},
  ): PointerEvent[] {
    const events = []

    if (pointers.removed.length > 0) {
      this.accessRecentlyDeletedData(true)
    }

    let added = pointers.added
    let current = pointers.current
    let removed = pointers.removed
    let changed = pointers.changed

    if (filters.button !== undefined) {
      added = added.filter((e) => e.read(comps.Pointer).button === filters.button)
      current = current.filter((e) => e.read(comps.Pointer).button === filters.button)
      removed = removed.filter((e) => e.read(comps.Pointer).button === filters.button)
      changed = changed.filter((e) => e.read(comps.Pointer).button === filters.button)
    }

    if (added.length > 0 && current.length === 1) {
      const pointer = current[0].read(comps.Pointer)
      events.push({
        type: 'pointerDown',
        clientPosition: pointer.downPosition,
        worldPosition: camera.toWorld(pointer.downPosition),
        blockEntity: intersect.entity || null,
      } as PointerEvent)
    }

    if (added.length > 0 && current.length > 1) {
      events.push({ type: 'cancel' } as PointerEvent)
    }

    if (removed.length > 0 && current.length === 0) {
      const pointer = removed[0].read(comps.Pointer)
      events.push({
        type: 'pointerUp',
        clientPosition: pointer.position,
        worldPosition: camera.toWorld(pointer.position),
        blockEntity: intersect.entity || null,
      } as PointerEvent)

      const dist = distance(pointer.downPosition, pointer.position)
      const deltaFrame = this.frame.value - pointer.downFrame
      if (dist < CLICK_MOVE_THRESHOLD && deltaFrame < CLICK_FRAME_THRESHOLD) {
        events.push({
          type: 'click',
          clientPosition: pointer.position,
          worldPosition: camera.toWorld(pointer.position),
          blockEntity: intersect.entity || null,
        } as PointerEvent)
      }
    }

    if (changed.length > 0 && current.length === 1) {
      const pointer = current[0].read(comps.Pointer)
      events.push({
        type: 'pointerMove',
        worldPosition: camera.toWorld(pointer.position),
        clientPosition: pointer.position,
        blockEntity: intersect.entity || null,
      } as PointerEvent)
    }

    return events
  }

  protected getMouseEvents(
    mouse: Readonly<comps.Mouse>,
    camera: Readonly<comps.Camera>,
    intersect: Readonly<comps.Intersect>,
  ): MouseEvent[] {
    const events = []

    if (mouse.wheelTrigger) {
      events.push({
        type: 'wheel',
        delta: mouse.wheelDelta,
      } as MouseEvent)
    }

    if (mouse.moveTrigger) {
      events.push({
        type: 'mouseMove',
        worldPosition: camera.toWorld(mouse.position),
        clientPosition: mouse.position,
        blockEntity: intersect.entity || null,
      } as MouseEvent)
    }

    return events
  }

  protected runMachine<T>(
    machine: AnyStateMachine,
    value: T,
    context: Record<string, any>,
    events: Array<any>,
  ): { value: T; context: Record<string, any> } {
    if (events.length === 0) return { value, context }

    let state = machine.resolveState({
      value: String(value),
      context,
    })

    for (const event of events) {
      const result = transition(machine, state, event)
      state = result[0]

      for (const action of result[1]) {
        if (typeof action.exec === 'function') {
          action.exec(action.info, action.params)
        }
      }
    }

    return { value: state.value, context: state.context }
  }
}
