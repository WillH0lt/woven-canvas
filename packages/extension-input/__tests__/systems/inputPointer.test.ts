import { PointerType, comps } from '@infinitecanvas/core'
import { System, World } from '@lastolivegames/becsy'
import { afterEach, beforeEach } from 'vitest'
import { InputPointer } from '../../src/systems/InputPointer'

interface PointerModel {
  id: number
  downPosition: [number, number]
  position: [number, number]
  pointerType: PointerType
}

let addedPointers: PointerModel[] = []
let currentPointers: PointerModel[] = []
let removedPointers: PointerModel[] = []

let world: World
let domElement: HTMLDivElement

class PointerReader extends System {
  private readonly pointers = this.query((q) => q.added.current.removed.with(comps.Pointer))

  public constructor() {
    super()
    this.schedule((s) => s.after(InputPointer))
  }

  execute() {
    addedPointers = []
    currentPointers = []
    removedPointers = []

    for (const pointerEntity of this.pointers.added) {
      const model = this.toModel(pointerEntity.read(comps.Pointer))
      addedPointers.push(model)
    }

    for (const pointerEntity of this.pointers.current) {
      const model = this.toModel(pointerEntity.read(comps.Pointer))
      currentPointers.push(model)
    }

    if (this.pointers.removed.length) {
      this.accessRecentlyDeletedData(true)
    }
    for (const pointerEntity of this.pointers.removed) {
      const model = this.toModel(pointerEntity.read(comps.Pointer))
      removedPointers.push(model)
    }
  }

  private toModel(pointer: comps.Pointer): PointerModel {
    return {
      id: pointer.id,
      downPosition: [pointer.downPosition[0], pointer.downPosition[1]],
      position: [pointer.position[0], pointer.position[1]],
      pointerType: pointer.pointerType,
    }
  }
}

beforeEach(async () => {
  domElement = document.createElement('div')
  const resources = { domElement }
  world = await World.create({
    defs: [System.group(InputPointer, { resources }, PointerReader)],
  })
  addedPointers = []
  currentPointers = []
  removedPointers = []
})

afterEach(async () => {
  if (world) await world.terminate()
})

describe('InputPointer', () => {
  it('should add a pointer on pointerdown', async () => {
    const event = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, button: 0 })
    domElement.dispatchEvent(event)
    await world.execute()

    expect(addedPointers.length).toBe(1)
    expect(currentPointers.length).toBe(1)
    expect(removedPointers.length).toBe(0)

    const pointer = currentPointers[0]
    expect(pointer.id).toBe(0) // First pointer should have ID 0
    expect(pointer.downPosition).toEqual([10, 20])
    expect(pointer.position).toEqual([10, 20])
    expect(pointer.pointerType).toBe(PointerType.Mouse)
  })

  it('should update position on pointermove', async () => {
    // First, simulate pointerdown to add a pointer
    const pointerId = 1
    const downEvent = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId })
    domElement.dispatchEvent(downEvent)
    await world.execute()

    // Now simulate pointermove
    const moveEvent = new PointerEvent('pointermove', { clientX: 30, clientY: 40, pointerId })
    window.dispatchEvent(moveEvent)
    await world.execute()

    expect(currentPointers.length).toBe(1)
    const pointer = currentPointers[0]
    expect(pointer.position).toEqual([30, 40])
  })

  it('should remove pointer on pointerup', async () => {
    const pointerId = 0
    // First, simulate pointerdown to add a pointer
    const downEvent = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId })
    domElement.dispatchEvent(downEvent)
    await world.execute()

    // Now simulate pointerup
    const upEvent = new PointerEvent('pointerup', { clientX: 30, clientY: 40, pointerId })
    window.dispatchEvent(upEvent)
    await world.execute()

    expect(addedPointers.length).toBe(0)
    expect(currentPointers.length).toBe(0)
    expect(removedPointers.length).toBe(1)

    const removedPointer = removedPointers[0]
    expect(removedPointer.id).toBe(0) // Should match the ID of the added pointer
  })

  it('should handle multiple pointers', async () => {
    const id1 = 111
    const id2 = 222

    // Simulate first pointer down
    const downEvent1 = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId: id1 })
    domElement.dispatchEvent(downEvent1)
    await world.execute()

    // Simulate second pointer down
    const downEvent2 = new PointerEvent('pointerdown', { clientX: 30, clientY: 40, pointerId: id2 })
    domElement.dispatchEvent(downEvent2)
    await world.execute()

    expect(addedPointers.length).toBe(1)
    expect(currentPointers.length).toBe(2)

    // Check first pointer
    let pointer = currentPointers[0]
    expect(pointer.id).toBe(id1)
    expect(pointer.downPosition).toEqual([10, 20])
    expect(pointer.position).toEqual([10, 20])

    // Check second pointer
    pointer = currentPointers[1]
    expect(pointer.id).toBe(id2)
    expect(pointer.downPosition).toEqual([30, 40])
    expect(pointer.position).toEqual([30, 40])

    // Simulate pointer move for first pointer
    const moveEvent1 = new PointerEvent('pointermove', { clientX: 50, clientY: 60, pointerId: id1 })
    window.dispatchEvent(moveEvent1)
    await world.execute()

    expect(currentPointers[0].position).toEqual([50, 60])

    // Simulate pointer up for first pointer
    const upEvent1 = new PointerEvent('pointerup', { clientX: 70, clientY: 80, pointerId: id1 })
    window.dispatchEvent(upEvent1)
    await world.execute()

    expect(currentPointers.length).toBe(1) // Only second pointer should remain
    expect(removedPointers.length).toBe(1) // First pointer should be removed

    const removedPointer = removedPointers[0]
    expect(removedPointer.id).toBe(id1) // Should match the ID of the first added pointer
  })

  it('should handle pointer cancel', async () => {
    const pointerId = 0
    // First, simulate pointerdown to add a pointer
    const downEvent = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId })
    domElement.dispatchEvent(downEvent)
    await world.execute()

    // Now simulate pointercancel
    const cancelEvent = new PointerEvent('pointercancel', { pointerId })
    window.dispatchEvent(cancelEvent)
    await world.execute()

    expect(addedPointers.length).toBe(0)
    expect(currentPointers.length).toBe(0)
    expect(removedPointers.length).toBe(1)

    const removedPointer = removedPointers[0]
    expect(removedPointer.id).toBe(pointerId) // Should match the ID of the added pointer
  })

  it('should handle pointer down then up in a single frame', async () => {
    const pointerId = 111

    const downEvent = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId })
    domElement.dispatchEvent(downEvent)

    const upEvent = new PointerEvent('pointerup', { clientX: 30, clientY: 40, pointerId })
    window.dispatchEvent(upEvent)

    await world.execute()

    expect(addedPointers.length).toBe(0)
    expect(currentPointers.length).toBe(0)
    expect(removedPointers.length).toBe(0)
  })

  it('should handle pointer up then down in a single frame', async () => {
    const pointerId = 111

    const upEvent = new PointerEvent('pointerup', { clientX: 30, clientY: 40, pointerId })
    window.dispatchEvent(upEvent)

    const downEvent = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, pointerId })
    domElement.dispatchEvent(downEvent)

    await world.execute()

    expect(addedPointers.length).toBe(1)
    expect(currentPointers.length).toBe(1)
    expect(removedPointers.length).toBe(0)
  })
})
