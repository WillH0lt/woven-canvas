import { BaseSystem, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { and, not, setup } from 'xstate'

import type { Entity } from '@lastolivegames/becsy'
import * as transformComps from '../components'
import { TransformBoxState, TransformCommand, type TransformCommandArgs } from '../types'
import { CaptureSelect } from './CaptureSelect'

type SelectionEvent =
  | PointerEvent
  | {
      type: 'selectionChanged'
      selectedEntities: Entity[]
    }

export class CaptureTransformBox extends BaseSystem<TransformCommandArgs & CoreCommandArgs> {
  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected))

  private readonly transformBoxes = this.query(
    (q) => q.current.with(transformComps.TransformBox).write.using(transformComps.TransformHandle).read,
  )

  private readonly transformBoxState = this.singleton.write(transformComps.TransformBoxState)

  public constructor() {
    super()
    this.schedule((s) => s.after(CaptureSelect))
  }

  private readonly transformBoxMachine = setup({
    types: {
      events: {} as SelectionEvent,
    },
    guards: {
      isSelectionEditable: () => {
        const selectedEntities = this.selectedBlocks.current.filter(
          (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
        )

        if (selectedEntities.length !== 1) return false

        const block = selectedEntities[0].read(comps.Block)
        const blockDef = this.getBlockDef(block.tag)
        return blockDef?.canEdit ?? false
      },
      isOverTransformBox: ({ event }) => {
        if (!('intersects' in event)) return false
        const intersect = event.intersects[0]
        if (!intersect?.has(transformComps.TransformBox)) return false

        return true
      },
      isOverTransformHandle: ({ event }) => {
        if (!('intersects' in event)) return false
        const intersect = event.intersects[0]
        if (!intersect?.has(transformComps.TransformHandle)) return false

        return true
      },
      selectionIsTransformable: ({ event }) => {
        if (!('selectedEntities' in event)) return false
        if (event.selectedEntities.length > 1) return true
        if (event.selectedEntities.length === 0) return false

        const entity = event.selectedEntities[0]
        const block = entity.read(comps.Block)
        const blockDef = this.getBlockDef(block.tag)
        if (blockDef?.resizeMode === 'groupOnly') {
          return false
        }

        return true
      },
    },
    actions: {
      addTransformBox: () => {
        this.emitCommand(TransformCommand.AddTransformBox)
      },
      updateTransformBox: () => {
        this.emitCommand(TransformCommand.UpdateTransformBox)
      },
      hideTransformBox: () => {
        this.emitCommand(TransformCommand.HideTransformBox)
      },
      showTransformBox: () => {
        this.emitCommand(TransformCommand.ShowTransformBox)
      },
      removeTransformBox: () => {
        this.emitCommand(TransformCommand.RemoveTransformBox)
      },
      startTransformBoxEdit: () => {
        this.emitCommand(TransformCommand.StartTransformBoxEdit)
      },
      endTransformBoxEdit: () => {
        this.emitCommand(TransformCommand.EndTransformBoxEdit)
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
              guard: 'selectionIsTransformable',
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
              guard: not('selectionIsTransformable'),
              target: TransformBoxState.None,
            },
            {
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
            guard: and(['isOverTransformBox', 'isSelectionEditable']),
            target: TransformBoxState.Editing,
          },
        },
      },
      [TransformBoxState.Editing]: {
        entry: ['startTransformBoxEdit', 'hideTransformBox'],
        on: {
          pointerDown: {
            guard: and([not('isOverTransformBox'), not('isOverTransformHandle')]),
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

    const buttons = this.controls.getButtons('select')
    const e = this.getPointerEvents(buttons)
    events.push(...e)

    return events
  }
}
