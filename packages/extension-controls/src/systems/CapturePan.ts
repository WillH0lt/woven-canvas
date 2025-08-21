import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { assign, setup } from 'xstate'
import { PanState as PanStateComp } from '../components'
import { PanState } from '../types'
import { CaptureZoom } from './CaptureZoom'

export class CapturePan extends BaseSystem<CoreCommandArgs> {
  private readonly pointers = this.query((q) => q.added.current.changed.removed.with(comps.Pointer).read.trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly controls = this.singleton.read(comps.Controls)

  private readonly panState = this.singleton.write(PanStateComp)

  private readonly panMachine = setup({
    types: {
      context: {} as {
        panStart: [number, number]
      },
      events: {} as PointerEvent,
    },
    actions: {
      setDragStart: assign({
        panStart: ({ event }) => event.worldPosition,
      }),

      resetContext: assign({
        panStart: [0, 0],
      }),
    },
  }).createMachine({
    id: 'pan',
    initial: PanState.Idle,
    context: {
      panStart: [0, 0],
    },
    states: {
      [PanState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: {
            actions: 'setDragStart',
            target: PanState.Panning,
          },
        },
      },
      [PanState.Panning]: {
        on: {
          pointerMove: [
            {
              actions: ({ context, event }) => {
                const deltaX = event.worldPosition[0] - context.panStart[0]
                const deltaY = event.worldPosition[1] - context.panStart[1]
                const x = this.camera.left - deltaX
                const y = this.camera.top - deltaY

                this.emitCommand(CoreCommand.MoveCamera, { x, y })
              },
            },
          ],
          pointerUp: {
            target: PanState.Idle,
          },
        },
      },
    },
  })

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureZoom))
  }

  public execute(): void {
    const buttons = this.controls.getButtons('hand')

    const pointerEvents = this.getPointerEvents(this.pointers, this.camera, this.intersect, buttons)

    if (pointerEvents.length === 0) return

    const { value, context } = this.runMachine<PanState>(
      this.panMachine,
      this.panState.state,
      this.panState,
      pointerEvents,
    )

    Object.assign(this.panState, context)
    this.panState.state = value
  }
}
