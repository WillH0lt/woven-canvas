import {
  BaseSystem,
  BlockCommand,
  type BlockCommandArgs,
  PointerButton,
  type PointerEvent,
  comps,
} from '@infinitecanvas/core'
import { assign, setup } from 'xstate'
import { DragState as DragStateComp } from '../components'
import { type ControlCommandArgs, DragState } from '../types'
import { CaptureZoom } from './CaptureZoom'

export class CaptureDrag extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly pointers = this.query((q) => q.added.current.changed.removed.with(comps.Pointer).read.trackWrites)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly dragState = this.singleton.write(DragStateComp)

  private readonly dragMachine = setup({
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
    initial: DragState.Idle,
    context: {
      dragStart: [0, 0],
    },
    states: {
      [DragState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerDown: {
            actions: 'setDragStart',
            target: DragState.Dragging,
          },
        },
      },
      [DragState.Dragging]: {
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
            target: DragState.Idle,
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

    const { value, context } = this.runMachine<DragState>(
      this.dragMachine,
      this.dragState.state,
      this.dragState,
      pointerEvents,
    )

    Object.assign(this.dragState, context)
    this.dragState.state = value
  }
}
