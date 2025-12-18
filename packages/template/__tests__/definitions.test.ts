import { describe, it, expect } from "vitest";
import { field } from "@infinitecanvas/ecs";
import { defineBlock, defineMeta, defineSingleton } from "../src";

describe("defineBlock", () => {
  it("should create a block component with default sync", () => {
    const Block = defineBlock({
      x: field.float32(),
      y: field.float32(),
    });

    expect(Block.__editor.category).toBe("block");
    expect(Block.__editor.sync).toBe("document");
  });

  it("should allow custom sync behavior", () => {
    const Block = defineBlock(
      {
        x: field.float32(),
      },
      { sync: "presence" }
    );

    expect(Block.__editor.sync).toBe("presence");
  });

  it("should preserve component schema", () => {
    const Block = defineBlock({
      x: field.float32().default(10),
      name: field.string().max(50),
    });

    expect(Block.schema).toBeDefined();
    expect(Block.schema.x).toBeDefined();
    expect(Block.schema.name).toBeDefined();
  });
});

describe("defineMeta", () => {
  it("should create a meta component with default sync", () => {
    const Selected = defineMeta({});

    expect(Selected.__editor.category).toBe("meta");
    expect(Selected.__editor.sync).toBe("document");
  });

  it("should allow presence sync for selection-like components", () => {
    const Selected = defineMeta({}, { sync: "presence" });

    expect(Selected.__editor.sync).toBe("presence");
  });

  it("should allow ephemeral sync for local-only state", () => {
    const Dragging = defineMeta({}, { sync: "none" });

    expect(Dragging.__editor.sync).toBe("none");
  });

  it("should support complex meta schemas", () => {
    const Shadow = defineMeta({
      blur: field.float32().default(10),
      offsetX: field.float32().default(0),
      offsetY: field.float32().default(4),
      color: field.string().max(32).default("rgba(0,0,0,0.2)"),
    });

    expect(Shadow.__editor.category).toBe("meta");
    expect(Shadow.schema.blur).toBeDefined();
    expect(Shadow.schema.color).toBeDefined();
  });
});

describe("defineSingleton", () => {
  it("should create a singleton with default sync (none)", () => {
    const ToolState = defineSingleton({
      active: field.string().max(32).default("select"),
    });

    expect(ToolState.__editor.category).toBe("singleton");
    expect(ToolState.__editor.sync).toBe("none");
  });

  it("should allow presence sync for camera-like singletons", () => {
    const Camera = defineSingleton(
      {
        x: field.float64().default(0),
        y: field.float64().default(0),
        zoom: field.float64().default(1),
      },
      { sync: "presence" }
    );

    expect(Camera.__editor.sync).toBe("presence");
  });

  it("should allow document sync for persistent settings", () => {
    const GridConfig = defineSingleton(
      {
        enabled: field.boolean().default(true),
        size: field.float32().default(20),
      },
      { sync: "document" }
    );

    expect(GridConfig.__editor.sync).toBe("document");
  });

  it("should allow presence sync for session data", () => {
    const SessionData = defineSingleton(
      {
        lastViewedAt: field.float64(),
      },
      { sync: "presence" }
    );

    expect(SessionData.__editor.sync).toBe("presence");
  });
});

describe("component integration", () => {
  it("should work together in a plugin", () => {
    // Simulate defining components for a simple drawing plugin
    const Block = defineBlock({
      id: field.string().max(36),
      left: field.float64(),
      top: field.float64(),
      width: field.float64(),
      height: field.float64(),
    });

    const Selected = defineMeta({}, { sync: "presence" });
    const Hovered = defineMeta({}, { sync: "none" });

    const Color = defineMeta({
      r: field.uint8().default(255),
      g: field.uint8().default(255),
      b: field.uint8().default(255),
      a: field.float32().default(1),
    });

    const Camera = defineSingleton(
      {
        x: field.float64().default(0),
        y: field.float64().default(0),
        zoom: field.float64().default(1),
      },
      { sync: "presence" }
    );

    // All components should have correct categories
    expect(Block.__editor.category).toBe("block");
    expect(Selected.__editor.category).toBe("meta");
    expect(Hovered.__editor.category).toBe("meta");
    expect(Color.__editor.category).toBe("meta");
    expect(Camera.__editor.category).toBe("singleton");

    // All components should have appropriate sync
    expect(Block.__editor.sync).toBe("document");
    expect(Selected.__editor.sync).toBe("presence");
    expect(Hovered.__editor.sync).toBe("none");
    expect(Color.__editor.sync).toBe("document");
    expect(Camera.__editor.sync).toBe("presence");
  });
});
