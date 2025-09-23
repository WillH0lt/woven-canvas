import type { Entity } from '@lastolivegames/becsy'
import { and, not, setup } from 'xstate'

import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import {
  Block,
  Selected,
  TransformBox,
  TransformBoxState as TransformBoxStateComp,
  TransformHandle,
} from '../components'
import { type PointerEvent, TransformBoxState } from '../types'
import { CaptureBlockPlacement } from './CaptureBlockPlacement'
import { CaptureKeyboard } from './CaptureKeyboard'

type SelectionEvent =
  | PointerEvent
  | {
      type: 'selectionChanged'
      selectedEntities: Entity[]
    }

export class CaptureTransformBox extends BaseSystem<CoreCommandArgs> {
  private readonly selectedBlocks = this.query(
    (q) => q.added.removed.current.with(Block, Selected).using(TransformBox, TransformHandle).read,
  )

  private readonly transformBoxState = this.singleton.write(TransformBoxStateComp)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureBlockPlacement, CaptureKeyboard))
  }

  private readonly transformBoxMachine = setup({
    types: {
      events: {} as SelectionEvent,
    },
    guards: {
      isSelectionEditable: () => {
        const selectedEntities = this.selectedBlocks.current.filter(
          (e) => e.read(Selected).selectedBy === this.resources.uid,
        )

        if (selectedEntities.length !== 1) return false

        const block = selectedEntities[0].read(Block)
        const blockDef = this.getBlockDef(block.tag)
        return blockDef?.editOptions.canEdit ?? false
      },
      isOverTransformBox: ({ event }) => {
        if (!('intersects' in event)) return false
        const intersect = event.intersects[0]
        if (!intersect?.has(TransformBox)) return false

        return true
      },
      isOverTransformHandle: ({ event }) => {
        if (!('intersects' in event)) return false
        const intersect = event.intersects[0]
        if (!intersect?.has(TransformHandle)) return false

        return true
      },
      selectionIsTransformable: ({ event }) => {
        if (!('selectedEntities' in event)) return false
        if (event.selectedEntities.length > 1) return true
        if (event.selectedEntities.length === 0) return false

        const entity = event.selectedEntities[0]
        const block = entity.read(Block)
        const blockDef = this.getBlockDef(block.tag)
        if (blockDef?.resizeMode === 'groupOnly') {
          return false
        }

        return true
      },
    },
    actions: {
      addOrUpdateTransformBox: () => {
        this.emitCommand(CoreCommand.AddOrUpdateTransformBox)
      },
      updateTransformBox: () => {
        this.emitCommand(CoreCommand.UpdateTransformBox)
      },
      hideTransformBox: () => {
        this.emitCommand(CoreCommand.HideTransformBox)
      },
      showTransformBox: () => {
        this.emitCommand(CoreCommand.ShowTransformBox)
      },
      removeTransformBox: () => {
        this.emitCommand(CoreCommand.RemoveTransformBox)
      },
      startTransformBoxEdit: () => {
        this.emitCommand(CoreCommand.StartTransformBoxEdit)
      },
      endTransformBoxEdit: () => {
        this.emitCommand(CoreCommand.EndTransformBoxEdit)
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
        entry: 'addOrUpdateTransformBox',
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
      (e) => e.read(Selected).selectedBy === this.resources.uid,
    ).length

    const selectedEntities = this.selectedBlocks.current.filter(
      (e) => e.read(Selected).selectedBy === this.resources.uid,
    )

    if (addedCount > 0) {
      events.push({ type: 'selectionChanged', selectedEntities })
    } else {
      if (this.selectedBlocks.removed.length) {
        this.accessRecentlyDeletedData()
      }
      const removedCount = this.selectedBlocks.removed.filter(
        (e) => e.read(Selected).selectedBy === this.resources.uid,
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
