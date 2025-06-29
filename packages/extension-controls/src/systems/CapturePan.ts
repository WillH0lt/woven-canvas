import {
  BaseSystem,
  BlockCommand,
  type BlockCommandArgs,
  PointerButton,
  type PointerEvent,
  comps,
} from '@infinitecanvas/core'
import { assign, setup } from 'xstate'
import { PanState as PanStateComp } from '../components'
import { type ControlCommandArgs, PanState } from '../types'
import { CaptureZoom } from './CaptureZoom'

export class CapturePan extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly pointers = this.query((q) => q.added.current.changed.removed.with(comps.Pointer).read.trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly panState = this.singleton.write(PanStateComp)

  private readonly panMachine = setup({
    types: {
      context: {} as {
        dragStart: [number, number]
      },
      events: {} as PointerEvent,
    },
    actions: {
      setDragStart: assign({
        dragStart: ({ event, context }) => {
          if (!('worldPosition' in event)) return context.dragStart
          return event.worldPosition
        },
      }),

      resetContext: assign({
        dragStart: [0, 0],
      }),
    },
  }).createMachine({
    id: 'drag',
    initial: PanState.Idle,
    context: {
      dragStart: [0, 0],
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
                if (!('worldPosition' in event)) return
                const deltaX = event.worldPosition[0] - context.dragStart[0]
                const deltaY = event.worldPosition[1] - context.dragStart[1]
                const cameraX = this.camera.left - deltaX
                const cameraY = this.camera.top - deltaY

                this.emitCommand(BlockCommand.MoveCamera, cameraX, cameraY)
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
    let button: PointerButton | null = null
    if (this.tool.leftMouse === 'pan') {
      button = PointerButton.Left
    } else if (this.tool.middleMouse === 'pan') {
      button = PointerButton.Middle
    } else if (this.tool.rightMouse === 'pan') {
      button = PointerButton.Right
    }

    if (button === null) return

    const pointerEvents = this.getPointerEvents(this.pointers, this.camera, this.intersect, {
      button,
    })

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
