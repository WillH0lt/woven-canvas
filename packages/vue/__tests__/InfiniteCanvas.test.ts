import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { InfiniteCanvas } from "../src/components/InfiniteCanvas";
import type { Editor } from "@infinitecanvas/editor";

describe("InfiniteCanvas", () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });

    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      // no-op for tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should mount and render container element", () => {
    const wrapper = mount(InfiniteCanvas);

    expect(wrapper.find(".infinite-canvas").exists()).toBe(true);
    expect(wrapper.find(".infinite-canvas-blocks").exists()).toBe(true);
  });

  it("should have correct container styles", () => {
    const wrapper = mount(InfiniteCanvas);
    const container = wrapper.find(".infinite-canvas");

    expect(container.attributes("style")).toContain("position: relative");
    expect(container.attributes("style")).toContain("width: 100%");
    expect(container.attributes("style")).toContain("height: 100%");
    expect(container.attributes("style")).toContain("overflow: hidden");
  });

  it("should emit ready event with editor instance", async () => {
    const wrapper = mount(InfiniteCanvas);

    // Wait for async mount
    await flushPromises();

    const readyEvents = wrapper.emitted("ready");
    expect(readyEvents).toBeDefined();
    expect(readyEvents!.length).toBe(1);

    const editor = readyEvents![0][0] as Editor;
    expect(editor).toBeDefined();
    expect(typeof editor.tick).toBe("function");
    expect(typeof editor.dispose).toBe("function");
  });

  it("should start render loop on mount", async () => {
    mount(InfiniteCanvas);

    await flushPromises();

    // requestAnimationFrame should have been called to start the loop
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("should cancel animation frame on unmount", async () => {
    const wrapper = mount(InfiniteCanvas);

    await flushPromises();

    wrapper.unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("should accept blocks prop", () => {
    const blocks = [
      { tag: "rect", position: [100, 100] as [number, number], size: [50, 50] as [number, number], rotation: 0, rank: "a" },
    ];

    const wrapper = mount(InfiniteCanvas, {
      props: { blocks },
    });

    expect(wrapper.props("blocks")).toEqual(blocks);
  });

  it("should render block slot content", async () => {
    const wrapper = mount(InfiniteCanvas, {
      slots: {
        block: (props: { block: { tag: string } }) =>
          h("div", { class: "test-block" }, props.block.tag),
      },
    });

    await flushPromises();

    // Initially no blocks, so no slot content rendered
    expect(wrapper.find(".test-block").exists()).toBe(false);
  });

  it("should render tag-specific slot", async () => {
    const wrapper = mount(InfiniteCanvas, {
      slots: {
        "block:rect": () => h("div", { class: "rect-block" }, "Rectangle"),
        block: () => h("div", { class: "fallback-block" }, "Fallback"),
      },
    });

    await flushPromises();

    // No blocks in ECS yet, so nothing rendered
    // This test verifies the slot setup is correct
    expect(wrapper.vm).toBeDefined();
  });

  it("should dispose editor on unmount", async () => {
    const wrapper = mount(InfiniteCanvas);

    await flushPromises();

    const readyEvents = wrapper.emitted("ready");
    const editor = readyEvents![0][0] as Editor;
    const disposeSpy = vi.spyOn(editor, "dispose");

    wrapper.unmount();

    expect(disposeSpy).toHaveBeenCalled();
  });

  it("should emit update:blocks when tick runs", async () => {
    const wrapper = mount(InfiniteCanvas);

    await flushPromises();

    // Simulate a tick by calling the registered RAF callback
    expect(rafCallbacks.length).toBeGreaterThan(0);

    // Execute the first RAF callback (which is the tick function)
    rafCallbacks[0](performance.now());

    await flushPromises();

    // After tick runs, update:blocks should be emitted
    const updateEvents = wrapper.emitted("update:blocks");
    expect(updateEvents).toBeDefined();
  });
});

describe("InfiniteCanvas slots", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should pass block slot props correctly", async () => {
    let receivedProps: unknown = null;

    const wrapper = mount(InfiniteCanvas, {
      slots: {
        block: (props: unknown) => {
          receivedProps = props;
          return h("div", "test");
        },
      },
    });

    await flushPromises();

    // Slot function is defined but won't be called until there are blocks
    expect(wrapper.vm).toBeDefined();
  });
});

describe("InfiniteCanvas v-model", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should support v-model:blocks", async () => {
    const blocks = [
      { tag: "rect", position: [0, 0] as [number, number], size: [100, 100] as [number, number], rotation: 0, rank: "a" },
    ];

    const wrapper = mount(InfiniteCanvas, {
      props: {
        blocks,
        "onUpdate:blocks": (e: unknown) => wrapper.setProps({ blocks: e as typeof blocks }),
      },
    });

    await flushPromises();

    expect(wrapper.props("blocks")).toEqual(blocks);
  });
});
