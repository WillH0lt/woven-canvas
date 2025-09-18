import { BaseSystem, CoreCommand, type CoreCommandArgs, type PointerEvent } from '@infinitecanvas/core'
import { assign, not, setup } from 'xstate'

import { SelectionState } from '@infinitecanvas/core/components'
import { ScrollEdgesState as ScrollEdgesStateComp } from '../components'
import { type ControlsResources, ScrollEdgesState } from '../types'
import { CapturePan } from './CapturePan'
import { CaptureScroll } from './CaptureScroll'
import { CaptureZoom } from './CaptureZoom'

const EDGE_SIZE = 10
const EDGE_SCROLL_SPEED = 15
const EDGE_SCROLL_DELAY = 250

export class CaptureScrollEdges extends BaseSystem<CoreCommandArgs> {
  protected readonly resources!: ControlsResources

  private readonly selectionState = this.singleton.read(SelectionState)

  private readonly scrollEdgesState = this.singleton.write(ScrollEdgesStateComp)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CapturePan, CaptureZoom, CaptureScroll))
  }

  private readonly scrollEdgesMachine = setup({
    types: {
      context: {} as {
        edgeEnterStartTime: number
      },
      events: {} as PointerEvent,
    },
    guards: {
      isPointerNearEdge: ({ event }) => {
        const viewportWidth = this.screen.width
        const viewportHeight = this.screen.height

        // get the cursor position in screen space
        const cursorX = event.clientPosition[0]
        const cursorY = event.clientPosition[1]

        return (
          cursorX < EDGE_SIZE ||
          cursorX > viewportWidth - EDGE_SIZE ||
          cursorY < EDGE_SIZE ||
          cursorY > viewportHeight - EDGE_SIZE
        )
      },

      isEdgeScrollDelayPassed: ({ context }) => {
        return performance.now() - context.edgeEnterStartTime >= EDGE_SCROLL_DELAY
      },
    },

    actions: {
      setEdgeEnterStartTime: assign({
        edgeEnterStartTime: () => performance.now(),
      }),

      moveCamera: ({ event }) => {
        const viewportWidth = this.screen.width
        const viewportHeight = this.screen.height

        const cursorX = event.clientPosition[0]
        const cursorY = event.clientPosition[1]

        let shiftX = 0
        let shiftY = 0

        const shift = EDGE_SCROLL_SPEED / this.camera.zoom

        if (cursorX < EDGE_SIZE) {
          shiftX = -shift
        } else if (cursorX > viewportWidth - EDGE_SIZE) {
          shiftX = shift
        }

        if (cursorY < EDGE_SIZE) {
          shiftY = -shift
        } else if (cursorY > viewportHeight - EDGE_SIZE) {
          shiftY = shift
        }

        if (shiftX === 0 && shiftY === 0) return

        this.emitCommand(CoreCommand.TranslateCamera, { x: shiftX, y: shiftY })
      },

      resetContext: assign({
        edgeEnterStartTime: 0,
      }),
    },
  }).createMachine({
    id: 'scrollEdges',
    initial: ScrollEdgesState.Idle,
    context: {
      edgeEnterStartTime: 0,
    },
    states: {
      [ScrollEdgesState.Idle]: {
        entry: 'resetContext',
        on: {
          pointerMove: {
            guard: 'isPointerNearEdge',
            target: ScrollEdgesState.Waiting,
          },
        },
      },
      [ScrollEdgesState.Waiting]: {
        entry: 'setEdgeEnterStartTime',
        on: {
          pointerMove: {
            guard: not('isPointerNearEdge'),
            target: ScrollEdgesState.Idle,
          },
          frame: {
            guard: 'isEdgeScrollDelayPassed',
            target: ScrollEdgesState.Scrolling,
          },
        },
      },
      [ScrollEdgesState.Scrolling]: {
        on: {
          frame: [
            {
              guard: not('isPointerNearEdge'),
              target: ScrollEdgesState.Idle,
            },
            {
              actions: 'moveCamera',
            },
          ],
        },
      },
    },
  })

  public execute(): void {
    if (!['dragging', 'selectionBoxDragging'].includes(this.selectionState.state)) return

    const buttons = this.controls.getButtons('select')
    const events = this.getPointerEvents(buttons, { includeFrameEvent: true })

    if (events.length === 0) return

    const { value, context } = this.runMachine<ScrollEdgesState>(
      this.scrollEdgesMachine,
      this.scrollEdgesState.state,
      this.scrollEdgesState.toJson(),
      events,
    )

    Object.assign(this.scrollEdgesState, context)
    this.scrollEdgesState.state = value
  }
}
