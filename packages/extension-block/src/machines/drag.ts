import { assign, setup } from 'xstate'

import { DragState } from '../types'

interface DragContext {
  grabOffset: [number, number]
  pointerStart: [number, number]
  delta: [number, number]
}

// Minimum pointer move distance to start dragging
const DRAG_THRESHOLD = 3

export type DragEvent =
  | { type: 'pointerDown'; position: [number, number] }
  | { type: 'pointerMove'; position: [number, number] }
  | { type: 'pointerUp' }
  | { type: 'cancel' }

const calculateDistance = (a: [number, number], b: [number, number]): number => {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
}

export const dragMachine = setup({
  types: {
    context: {} as DragContext,
    events: {} as DragEvent,
  },
  guards: {
    isThresholdReached: ({ context, event }) => {
      if (event.type !== 'pointerMove') return false
      const distance = calculateDistance(context.pointerStart, event.position)
      return distance >= DRAG_THRESHOLD
    },
  },
  actions: {
    setGrabOffset: assign({
      grabOffset: ({ context, event }) => {
        if (event.type !== 'pointerMove') return context.grabOffset
        return [event.position[0] - context.pointerStart[0], event.position[1] - context.pointerStart[1]] as [
          number,
          number,
        ]
      },
    }),
    updateDelta: assign({
      delta: ({ context, event }) => {
        if (event.type !== 'pointerMove') return context.delta
        return [
          event.position[0] - context.pointerStart[0] - context.grabOffset[0],
          event.position[1] - context.pointerStart[1] - context.grabOffset[1],
        ] as [number, number]
      },
    }),
    resetContext: assign({
      grabOffset: [0, 0],
      pointerStart: [0, 0],
      delta: [0, 0],
    }),
  },
}).createMachine({
  id: 'dragBlock',
  initial: DragState.Pointing,
  context: {
    grabOffset: [0, 0],
    pointerStart: [0, 0],
    delta: [0, 0],
  },
  states: {
    [DragState.Pointing]: {
      on: {
        pointerMove: [
          {
            target: DragState.Dragging,
            guard: 'isThresholdReached',
            actions: 'setGrabOffset',
          },
        ],
        pointerUp: {
          target: DragState.End,
        },
        cancel: {
          target: DragState.End,
          actions: 'resetContext',
        },
      },
    },
    [DragState.Dragging]: {
      on: {
        pointerMove: {
          actions: 'updateDelta',
        },
        pointerUp: {
          target: DragState.End,
        },
        cancel: {
          target: DragState.End,
          actions: 'resetContext',
        },
      },
    },
    [DragState.End]: {
      type: 'final',
    },
  },
})
