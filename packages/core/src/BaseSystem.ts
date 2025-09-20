import { type ComponentType, type Entity, System } from '@lastolivegames/becsy'
import { type AnyStateMachine, transition } from 'xstate'

import * as comps from './components'
import { distance } from './helpers'
import type { BaseResources, BlockDef, MouseEvent, PointerButton, PointerEvent, ToolDef } from './types'

const CLICK_MOVE_THRESHOLD = 1
const CLICK_FRAME_THRESHOLD = 60

function isEntity(item: any): boolean {
  return item !== null && typeof item === 'object' && item.alive && typeof item.__id === 'number'
}

type BaseCommands = {
  [commandKind: string]: Array<unknown>
}
export class BaseSystem<TCommands extends BaseCommands = {}> extends System {
  protected readonly resources!: BaseResources

  readonly #_toBeDeleted = this.query((q) => q.using(comps.ToBeDeleted).write)

  readonly #commands = this.query(
    (q) =>
      q.added
        .with(comps.Command)
        .write.orderBy((e) => e.ordinal)
        .using(comps.CommandRef).write,
  )

  protected readonly pointers = this.query((q) => q.added.current.changed.removed.with(comps.Pointer).read.trackWrites)

  protected readonly mouse = this.singleton.read(comps.Mouse)

  protected readonly screen = this.singleton.read(comps.Screen)

  protected readonly camera = this.singleton.read(comps.Camera)

  protected readonly controls = this.singleton.read(comps.Controls)

  protected readonly keyboard = this.singleton.read(comps.Keyboard)

  protected readonly intersect = this.singleton.read(comps.Intersect)

  protected readonly frame = this.singleton.read(comps.Frame)

  private commandListeners: {
    [K in keyof TCommands]?: ((...data: TCommands[K]) => void)[]
  } = {}

  public execute(): void {
    this.executeCommands()
  }

  protected deleteEntity(entity: Entity): void {
    this.deleteEntities([entity])
  }

  protected deleteEntities(entities: readonly Entity[]): void {
    for (const entity of entities) {
      if (!entity.has(comps.ToBeDeleted) && entity.alive) entity.add(comps.ToBeDeleted)
    }
  }

  protected setComponent<C>(entity: Entity, component: ComponentType<C>, args: Partial<C> = {}): void {
    if (!entity.has(component)) {
      entity.add(component, args)
    } else {
      const c = entity.write(component) as object
      Object.assign(c, args)
    }
  }

  protected unsetComponent<C>(entity: Entity, component: ComponentType<C>): void {
    if (entity.has(component)) {
      entity.remove(component)
    }
  }

  protected emitCommand<CommandKind extends keyof TCommands>(kind: CommandKind, ...data: TCommands[CommandKind]): void {
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

  protected addCommandListener<CommandKind extends keyof TCommands>(
    kind: CommandKind,
    callback: (...data: TCommands[CommandKind]) => void,
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

  protected getCommand<CommandKind extends keyof TCommands>(kind: CommandKind): TCommands[CommandKind] | undefined {
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

  protected getTool(name: string): ToolDef | undefined {
    return this.resources.tools[name]
  }

  protected getBlockDef(tag: string): BlockDef | undefined {
    return this.resources.blockDefs[tag]
  }

  protected getBlockElementById(blockId: string): HTMLElement | null {
    return this.resources.blockContainer.querySelector<HTMLElement>(`[id='${blockId}']`)
  }

  protected getPointerPosition(): [number, number] | null {
    if (this.pointers.current.length === 1) {
      const pointer = this.pointers.current[0].read(comps.Pointer)
      return [pointer.position[0], pointer.position[1]]
    }

    return null
  }

  protected getPointerEvents(buttons: PointerButton[], options: { includeFrameEvent?: boolean } = {}): PointerEvent[] {
    if (buttons.length === 0) return []

    const events: PointerEvent[] = []

    if (this.pointers.removed.length > 0) {
      this.accessRecentlyDeletedData(true)
    }

    let added = this.pointers.added
    let current = this.pointers.current
    let removed = this.pointers.removed
    let changed = this.pointers.changed

    const shouldIncludePointer = (e: Entity) => {
      const pointer = e.read(comps.Pointer)
      return buttons.includes(pointer.button)
    }

    added = added.filter(shouldIncludePointer)
    current = current.filter(shouldIncludePointer)
    removed = removed.filter(shouldIncludePointer)
    changed = changed.filter(shouldIncludePointer)

    const intersects: PointerEvent['intersects'] = [
      this.intersect.entity,
      this.intersect.entity2,
      this.intersect.entity3,
      this.intersect.entity4,
      this.intersect.entity5,
    ]

    if (added.length > 0 && current.length === 1) {
      const pointer = current[0].read(comps.Pointer)
      if (!pointer.obscured) {
        const ev = pointer.toEvent('pointerDown', intersects, this.keyboard)
        events.push(ev)
      }
    }

    // cancel the action if the pointer is down, and we push another pointer down.
    if (current.length >= 1 && this.pointers.added.length > 0 && this.pointers.current.length > 1) {
      const pointer = current[0].read(comps.Pointer)
      const ev = pointer.toEvent('cancel', intersects, this.keyboard)
      events.push(ev)
    }

    // not exactly a pointer event, but if somebody presses escape and the pointer
    // is down it should cancel the current action
    if (current.length >= 1 && this.keyboard.escapeDownTrigger) {
      const pointer = current[0].read(comps.Pointer)
      const ev = pointer.toEvent('cancel', intersects, this.keyboard)
      events.push(ev)
    }

    if (removed.length > 0 && current.length === 0) {
      const pointer = removed[0].read(comps.Pointer)
      const ev = pointer.toEvent('pointerUp', intersects, this.keyboard)
      events.push(ev)

      const dist = distance(pointer.downPosition, pointer.position)
      const deltaFrame = this.frame.value - pointer.downFrame
      if (dist < CLICK_MOVE_THRESHOLD && deltaFrame < CLICK_FRAME_THRESHOLD) {
        const clickEvent = pointer.toEvent('click', intersects, this.keyboard)
        events.push(clickEvent)
      }
    }

    if (
      (changed.length > 0 ||
        this.keyboard.shiftUpTrigger ||
        this.keyboard.shiftDownTrigger ||
        this.keyboard.altDownTrigger ||
        this.keyboard.altUpTrigger ||
        this.keyboard.modDownTrigger ||
        this.keyboard.modUpTrigger) &&
      current.length === 1
    ) {
      const pointer = current[0].read(comps.Pointer)
      const ev = pointer.toEvent('pointerMove', intersects, this.keyboard)
      events.push(ev)
    }

    if (options.includeFrameEvent && current.length === 1) {
      const pointer = current[0].read(comps.Pointer)
      const ev = pointer.toEvent('frame', intersects, this.keyboard)
      events.push(ev)
    }

    // for (const event of events) {
    //   event.intersects = [
    //     this.intersect.entity,
    //     this.intersect.entity2,
    //     this.intersect.entity3,
    //     this.intersect.entity4,
    //     this.intersect.entity5,
    //   ]
    //   event.shiftDown = this.keyboard.shiftDown
    //   event.altDown = this.keyboard.altDown
    //   event.modDown = this.keyboard.modDown
    // }

    return events
  }

  // protected getPointerPosition(buttons: PointerButton[]): [number, number] | null {
  //   for (const button of buttons) {
  //     const pointer = this.pointers.current.find((e) => e.read(comps.Pointer).button === button)
  //     if (pointer) {
  //       const p = pointer.read(comps.Pointer)
  //       return [p.position[0], p.position[1]]
  //     }
  //   }
  //   return null
  // }

  protected getMouseEvents(): MouseEvent[] {
    const events = []

    if (this.mouse.wheelTrigger) {
      events.push({
        type: 'wheel' as const,
        wheelDeltaX: this.mouse.wheelDeltaX,
        wheelDeltaY: this.mouse.wheelDeltaY,
        worldPosition: this.camera.toWorld(this.mouse.position),
        clientPosition: this.mouse.position,
      })
    }

    if (this.mouse.moveTrigger) {
      events.push({
        type: 'mouseMove' as const,
        wheelDeltaX: this.mouse.wheelDeltaX,
        wheelDeltaY: this.mouse.wheelDeltaY,
        worldPosition: this.camera.toWorld(this.mouse.position),
        clientPosition: this.mouse.position,
      })
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
