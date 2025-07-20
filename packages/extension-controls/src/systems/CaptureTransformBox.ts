import { BaseSystem, type CoreCommandArgs, type PointerEvent, comps } from '@infinitecanvas/core'
import { and, not, setup } from 'xstate'

import type { Entity } from '@lastolivegames/becsy'
import * as controlComps from '../components'
import { ControlCommand, type ControlCommandArgs, TransformBoxState } from '../types'
import { CapturePan } from './CapturePan'
import { CaptureSelect } from './CaptureSelect'

type SelectionEvent =
  | PointerEvent
  | {
      type: 'selectionChanged'
      selectedEntities: Entity[]
    }

export class CaptureTransformBox extends BaseSystem<ControlCommandArgs & CoreCommandArgs> {
  private readonly pointers = this.query((q) => q.added.removed.current.changed.with(comps.Pointer).trackWrites)

  private readonly selectedBlocks = this.query(
    (q) => q.added.removed.current.with(comps.Block, comps.Selected).using(comps.Text).read,
  )

  private readonly transformBoxes = this.query(
    (q) => q.current.with(controlComps.TransformBox).write.using(controlComps.TransformHandle).read,
  )

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly transformBoxState = this.singleton.write(controlComps.TransformBoxState)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelect, CapturePan))
  }

  private readonly transformBoxMachine = setup({
    types: {
      events: {} as SelectionEvent,
    },
    guards: {
      isSelectingText: () => {
        const selectedEntities = this.selectedBlocks.current.filter(
          (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
        )

        if (selectedEntities.length !== 1) return false
        if (!selectedEntities[0].has(comps.Text)) return false

        return true
      },
      isOverTransformBox: ({ event }) => {
        if (!('blockEntity' in event)) return false
        if (!event.blockEntity?.has(controlComps.TransformBox)) return false

        const block = event.blockEntity.read(comps.Block)

        return true
      },
      isOverTransformHandle: ({ event }) => {
        if (!('blockEntity' in event)) return false
        if (!event.blockEntity?.has(controlComps.TransformHandle)) return false

        return true
      },
    },
    actions: {
      addTransformBox: () => {
        this.emitCommand(ControlCommand.AddTransformBox)
      },
      updateTransformBox: () => {
        this.emitCommand(ControlCommand.UpdateTransformBox)
      },
      hideTransformBox: () => {
        this.emitCommand(ControlCommand.HideTransformBox)
      },
      showTransformBox: () => {
        this.emitCommand(ControlCommand.ShowTransformBox)
      },
      removeTransformBox: () => {
        this.emitCommand(ControlCommand.RemoveTransformBox)
      },
      startTransformBoxEdit: () => {
        this.emitCommand(ControlCommand.StartTransformBoxEdit)
      },
      endTransformBoxEdit: () => {
        this.emitCommand(ControlCommand.EndTransformBoxEdit)
      },
    },
  }).createMachine({
    id: 'transformBox',
    initial: TransformBoxState.None,
    states: {
      [TransformBoxState.None]: {
        entry: 'removeTransformBox',
        on: {
          selectionChanged: [
            {
              guard: ({ event }) => event.selectedEntities.length > 0,
              target: TransformBoxState.Idle,
            },
          ],
        },
      },
      [TransformBoxState.Idle]: {
        entry: 'addTransformBox',
        on: {
          selectionChanged: [
            {
              guard: ({ event }) => event.selectedEntities.length === 0,
              target: TransformBoxState.None,
            },
            {
              guard: ({ event }) => event.selectedEntities.length > 0,
              actions: 'updateTransformBox',
            },
          ],
          pointerDown: {
            actions: 'hideTransformBox',
          },
          pointerUp: {
            actions: 'showTransformBox',
          },
          click: {
            guard: and(['isOverTransformBox', 'isSelectingText']),
            target: TransformBoxState.EditingText,
          },
        },
      },
      [TransformBoxState.EditingText]: {
        entry: ['startTransformBoxEdit', 'hideTransformBox'],
        on: {
          pointerDown: {
            guard: and([not('isOverTransformBox'), not('isOverTransformHandle')]),
            actions: 'endTransformBoxEdit',
            target: TransformBoxState.None,
          },
        },
      },
    },
  })

  public execute(): void {
    const events = this.getSelectionEvents()

    if (events.length === 0) return

    const { value, context } = this.runMachine<TransformBoxState>(
      this.transformBoxMachine,
      this.transformBoxState.state,
      this.transformBoxState,
      events,
    )

    Object.assign(this.transformBoxState, context)
    this.transformBoxState.state = value
  }

  private getSelectionEvents(): SelectionEvent[] {
    const events: SelectionEvent[] = []

    const addedCount = this.selectedBlocks.added.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    ).length

    const selectedEntities = this.selectedBlocks.current.filter(
      (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
    )

    if (addedCount > 0) {
      events.push({ type: 'selectionChanged', selectedEntities })
    } else {
      if (this.selectedBlocks.removed.length) {
        this.accessRecentlyDeletedData()
      }
      const removedCount = this.selectedBlocks.removed.filter(
        (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
      ).length

      if (removedCount > 0) {
        events.push({ type: 'selectionChanged', selectedEntities })
      }
    }

    const button = this.tool.getButton('select', 'editText')
    if (button !== null) {
      const e = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
        button,
      })
      events.push(...e)
    }

    return events
  }
}
