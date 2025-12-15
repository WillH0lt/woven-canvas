import { describe, it, expect, vi } from "vitest";
import { setup, assign } from "xstate";
import { runMachine } from "../src/runMachine";

describe("runMachine", () => {
  // Simple counter machine for testing
  const counterMachine = setup({
    types: {
      context: {} as { count: number },
      events: {} as { type: "increment" } | { type: "decrement" } | { type: "reset" },
    },
    actions: {
      increment: assign({ count: ({ context }) => context.count + 1 }),
      decrement: assign({ count: ({ context }) => context.count - 1 }),
      reset: assign({ count: 0 }),
    },
  }).createMachine({
    id: "counter",
    initial: "active",
    context: { count: 0 },
    states: {
      active: {
        on: {
          increment: { actions: "increment" },
          decrement: { actions: "decrement" },
          reset: { actions: "reset" },
        },
      },
    },
  });

  it("should return same state and context when no events", () => {
    const result = runMachine(counterMachine, "active", { count: 5 }, []);

    expect(result.value).toBe("active");
    expect(result.context).toEqual({ count: 5 });
  });

  it("should process a single event", () => {
    const result = runMachine(counterMachine, "active", { count: 0 }, [
      { type: "increment" },
    ]);

    expect(result.value).toBe("active");
    expect(result.context).toEqual({ count: 1 });
  });

  it("should process multiple events in sequence", () => {
    const result = runMachine(counterMachine, "active", { count: 0 }, [
      { type: "increment" },
      { type: "increment" },
      { type: "increment" },
    ]);

    expect(result.value).toBe("active");
    expect(result.context).toEqual({ count: 3 });
  });

  it("should handle state transitions", () => {
    const trafficLightMachine = setup({
      types: {
        context: {} as object,
        events: {} as { type: "TIMER" },
      },
    }).createMachine({
      id: "trafficLight",
      initial: "green",
      context: {},
      states: {
        green: { on: { TIMER: "yellow" } },
        yellow: { on: { TIMER: "red" } },
        red: { on: { TIMER: "green" } },
      },
    });

    const result1 = runMachine(trafficLightMachine, "green", {}, [
      { type: "TIMER" },
    ]);
    expect(result1.value).toBe("yellow");

    const result2 = runMachine(trafficLightMachine, "yellow", {}, [
      { type: "TIMER" },
    ]);
    expect(result2.value).toBe("red");

    const result3 = runMachine(trafficLightMachine, "red", {}, [
      { type: "TIMER" },
    ]);
    expect(result3.value).toBe("green");
  });

  it("should execute actions", () => {
    const sideEffectFn = vi.fn();

    const machineWithSideEffect = setup({
      types: {
        context: {} as { value: number },
        events: {} as { type: "trigger"; payload: number },
      },
      actions: {
        sideEffect: ({ event }) => {
          sideEffectFn((event as { payload: number }).payload);
        },
        updateValue: assign({
          value: ({ event }) => (event as { payload: number }).payload,
        }),
      },
    }).createMachine({
      id: "sideEffect",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: {
          on: {
            trigger: {
              actions: ["sideEffect", "updateValue"],
            },
          },
        },
      },
    });

    const result = runMachine(machineWithSideEffect, "idle", { value: 0 }, [
      { type: "trigger", payload: 42 },
    ]);

    expect(sideEffectFn).toHaveBeenCalledWith(42);
    expect(result.context).toEqual({ value: 42 });
  });

  it("should work with guards", () => {
    const guardedMachine = setup({
      types: {
        context: {} as { count: number },
        events: {} as { type: "increment" },
      },
      guards: {
        canIncrement: ({ context }) => context.count < 3,
      },
      actions: {
        increment: assign({ count: ({ context }) => context.count + 1 }),
      },
    }).createMachine({
      id: "guarded",
      initial: "counting",
      context: { count: 0 },
      states: {
        counting: {
          on: {
            increment: {
              guard: "canIncrement",
              actions: "increment",
            },
          },
        },
      },
    });

    // Should increment when count < 3
    const result1 = runMachine(guardedMachine, "counting", { count: 0 }, [
      { type: "increment" },
    ]);
    expect(result1.context).toEqual({ count: 1 });

    // Should not increment when count >= 3
    const result2 = runMachine(guardedMachine, "counting", { count: 3 }, [
      { type: "increment" },
    ]);
    expect(result2.context).toEqual({ count: 3 });
  });

  it("should preserve existing context with partial updates", () => {
    const multiFieldMachine = setup({
      types: {
        context: {} as { x: number; y: number; z: number },
        events: {} as { type: "updateX"; value: number },
      },
      actions: {
        setX: assign({
          x: ({ event }) => (event as { value: number }).value,
        }),
      },
    }).createMachine({
      id: "multiField",
      initial: "idle",
      context: { x: 0, y: 0, z: 0 },
      states: {
        idle: {
          on: {
            updateX: { actions: "setX" },
          },
        },
      },
    });

    const result = runMachine(
      multiFieldMachine,
      "idle",
      { x: 1, y: 2, z: 3 },
      [{ type: "updateX", value: 10 }]
    );

    expect(result.context).toEqual({ x: 10, y: 2, z: 3 });
  });
});
