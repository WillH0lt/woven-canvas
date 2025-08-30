import { BaseSystem, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { assign, not, setup } from 'xstate'

import { Arrow, ArrowTransformState as ArrowTransformStateComp } from '../components'
import { ArrowCommand, type ArrowCommandArgs, ArrowTransformState } from '../types'
import { CaptureArrowDraw } from './CaptureArrowDraw'

type SelectionEvent =
  | PointerEvent
  | {
      type: 'selectionChanged'
      selectedEntities: Entity[]
    }

export class CaptureArrowTransform extends BaseSystem<ArrowCommandArgs> {
  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected))

  private readonly arrows = this.query((q) => q.using(Arrow).read)

  private readonly arrowTransformState = this.singleton.write(ArrowTransformStateComp)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureArrowDraw))
  }

  private readonly arrowTransformMachine = setup({
    types: {
      context: {} as {
        activeArrow: Entity | null
      },
      events: {} as SelectionEvent,
    },
    guards: {
      // isSelectingEditable: () => {
      //   const selectedEntities = this.selectedBlocks.current.filter(
      //     (e) => e.read(comps.Selected).selectedBy === this.resources.uid,
      //   )

      //   if (selectedEntities.length !== 1) return false

      //   const block = selectedEntities[0].read(comps.Block)
      //   const blockDef = this.getBlockDef(block.tag)
      //   return blockDef?.canEdit ?? false
      // },
      // isOverTransformBox: ({ event }) => {
      //   if (!('blockEntity' in event)) return false
      //   if (!event.blockEntity?.has(transformComps.TransformBox)) return false

      //   return true
      // },
      // isOverTransformHandle: ({ event }) => {
      //   if (!('blockEntity' in event)) return false
      //   if (!event.blockEntity?.has(transformComps.TransformHandle)) return false

      //   return true
      // },
      selectingSingleArrow: ({ event }) => {
        if (!('selectedEntities' in event)) return false
        if (event.selectedEntities.length !== 1) return false

        const entity = event.selectedEntities[0]
        return entity.has(Arrow)
      },
    },
    actions: {
      setActiveArrow: assign({
        activeArrow: ({ event }) => {
          if (!('selectedEntities' in event)) return null
          if (event.selectedEntities.length === 0) return null
          return event.selectedEntities[0]
        },
      }),
      addTransformHandles: ({ context }) => {
        if (!context.activeArrow) return
        this.emitCommand(ArrowCommand.AddTransformHandles, context.activeArrow)
      },
      removeTransformHandles: () => {
        this.emitCommand(ArrowCommand.RemoveTransformHandles)
      },
      hideTransformHandles: () => {
        this.emitCommand(ArrowCommand.HideTransformHandles)
      },
      showTransformHandles: () => {
        this.emitCommand(ArrowCommand.ShowTransformHandles)
      },
      updateTransformHandles: ({ context }) => {
        if (!context.activeArrow) return
        this.emitCommand(ArrowCommand.UpdateTransformHandles, context.activeArrow)
      },

      // startTransformBoxEdit: () => {
      //   this.emitCommand(TransformCommand.StartTransformBoxEdit)
      // },
      // endTransformBoxEdit: () => {
      //   this.emitCommand(TransformCommand.EndTransformBoxEdit)
      // },
    },
  }).createMachine({
    id: 'arrowTransform',
    initial: ArrowTransformState.None,
    context: {
      activeArrow: null,
    },
    states: {
      [ArrowTransformState.None]: {
        entry: 'removeTransformHandles',
        on: {
          selectionChanged: [
            {
              guard: 'selectingSingleArrow',
              actions: 'setActiveArrow',
              target: ArrowTransformState.Idle,
            },
          ],
        },
      },
      [ArrowTransformState.Idle]: {
        entry: 'addTransformHandles',
        on: {
          selectionChanged: [
            {
              guard: not('selectingSingleArrow'),
              target: ArrowTransformState.None,
            },
            {
              actions: ['setActiveArrow', 'updateTransformHandles'],
            },
          ],
          pointerDown: {
            actions: 'hideTransformHandles',
          },
          pointerUp: {
            actions: 'showTransformHandles',
          },
          // doubleClick: {
          //   guard: and(['isOverTransformBox', 'isSelectingEditable']),
          //   target: ArrowTransformState.Editing,
          // },
        },
      },
      // [ArrowTransformState.Editing]: {
      //   entry: ['startTransformBoxEdit', 'hideTransformBox'],
      //   on: {
      //     pointerDown: {
      //       guard: and([not('isOverTransformBox'), not('isOverTransformHandle')]),
      //       target: ArrowTransformState.None,
      //     },
      //   },
      // },
    },
  })

  public execute(): void {
    const events = this.getSelectionEvents()
    if (events.length === 0) return

    const { value, context } = this.runMachine<ArrowTransformState>(
      this.arrowTransformMachine,
      this.arrowTransformState.state,
      this.arrowTransformState.toJson(),
      events,
    )

    this.arrowTransformState.activeArrow = context.activeArrow?.alive ? context.activeArrow : null
    this.arrowTransformState.state = value
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
