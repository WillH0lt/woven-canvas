import { describe, it, expect, vi } from "vitest";
import { field } from "@woven-ecs/core";
import { sortPluginsByDependencies, type EditorPlugin } from "../src/plugin";
import { defineSystem } from "../src";
import { CanvasComponentDef } from "@woven-ecs/canvas-store";
import { CanvasSingletonDef } from "@woven-ecs/canvas-store";

describe("Plugin System", () => {
  describe("sortPluginsByDependencies", () => {
    it("should return plugins in same order when no dependencies", () => {
      const plugins: EditorPlugin[] = [
        { name: "a" },
        { name: "b" },
        { name: "c" },
      ];

      const sorted = sortPluginsByDependencies(plugins);

      expect(sorted.map((p) => p.name)).toEqual(["a", "b", "c"]);
    });

    it("should sort plugins with single dependency", () => {
      const plugins: EditorPlugin[] = [
        { name: "child", dependencies: ["parent"] },
        { name: "parent" },
      ];

      const sorted = sortPluginsByDependencies(plugins);

      expect(sorted.map((p) => p.name)).toEqual(["parent", "child"]);
    });

    it("should handle multiple dependencies", () => {
      const plugins: EditorPlugin[] = [
        { name: "app", dependencies: ["core", "ui"] },
        { name: "ui", dependencies: ["core"] },
        { name: "core" },
      ];

      const sorted = sortPluginsByDependencies(plugins);
      const names = sorted.map((p) => p.name);

      // core must come before ui and app
      expect(names.indexOf("core")).toBeLessThan(names.indexOf("ui"));
      expect(names.indexOf("core")).toBeLessThan(names.indexOf("app"));
      // ui must come before app
      expect(names.indexOf("ui")).toBeLessThan(names.indexOf("app"));
    });

    it("should handle complex dependency graph", () => {
      const plugins: EditorPlugin[] = [
        { name: "e", dependencies: ["c", "d"] },
        { name: "d", dependencies: ["b"] },
        { name: "c", dependencies: ["a", "b"] },
        { name: "b", dependencies: ["a"] },
        { name: "a" },
      ];

      const sorted = sortPluginsByDependencies(plugins);
      const names = sorted.map((p) => p.name);

      // Verify all dependency constraints
      expect(names.indexOf("a")).toBeLessThan(names.indexOf("b"));
      expect(names.indexOf("a")).toBeLessThan(names.indexOf("c"));
      expect(names.indexOf("b")).toBeLessThan(names.indexOf("c"));
      expect(names.indexOf("b")).toBeLessThan(names.indexOf("d"));
      expect(names.indexOf("c")).toBeLessThan(names.indexOf("e"));
      expect(names.indexOf("d")).toBeLessThan(names.indexOf("e"));
    });

    it("should throw on missing dependency", () => {
      const plugins: EditorPlugin[] = [
        { name: "child", dependencies: ["nonexistent"] },
      ];

      expect(() => sortPluginsByDependencies(plugins)).toThrow(
        'Plugin "child" depends on "nonexistent" which is not registered',
      );
    });

    it("should throw on circular dependency (direct)", () => {
      const plugins: EditorPlugin[] = [
        { name: "a", dependencies: ["b"] },
        { name: "b", dependencies: ["a"] },
      ];

      expect(() => sortPluginsByDependencies(plugins)).toThrow(
        "Circular plugin dependency",
      );
    });

    it("should throw on circular dependency (indirect)", () => {
      const plugins: EditorPlugin[] = [
        { name: "a", dependencies: ["c"] },
        { name: "b", dependencies: ["a"] },
        { name: "c", dependencies: ["b"] },
      ];

      expect(() => sortPluginsByDependencies(plugins)).toThrow(
        "Circular plugin dependency",
      );
    });

    it("should handle self-dependency as circular", () => {
      const plugins: EditorPlugin[] = [{ name: "a", dependencies: ["a"] }];

      expect(() => sortPluginsByDependencies(plugins)).toThrow(
        "Circular plugin dependency",
      );
    });
  });

  describe("EditorPlugin interface", () => {
    it("should support minimal plugin definition", () => {
      const plugin: EditorPlugin = {
        name: "minimal",
      };

      expect(plugin.name).toBe("minimal");
      expect(plugin.dependencies).toBeUndefined();
      expect(plugin.components).toBeUndefined();
      expect(plugin.updateSystems).toBeUndefined();
    });

    it("should support plugin with components", () => {
      const Block = new CanvasComponentDef(
        { name: "block" },
        {
          x: field.float32(),
          y: field.float32(),
        },
      );

      const Selected = new CanvasComponentDef(
        { name: "selected", sync: "ephemeral" },
        {},
      );

      const Camera = new CanvasSingletonDef(
        { name: "camera", sync: "ephemeral" },
        {
          zoom: field.float64().default(1),
        },
      );

      const plugin: EditorPlugin = {
        name: "canvas",
        components: [Block, Selected],
        singletons: [Camera],
      };

      expect(plugin.components).toHaveLength(2);
      expect(plugin.singletons).toHaveLength(1);
    });

    it("should support plugin with systems", () => {
      const updateSystem = defineSystem(() => {});
      const renderSystem = defineSystem(() => {});

      const plugin: EditorPlugin = {
        name: "rendering",
        updateSystems: [updateSystem],
        renderSystems: [renderSystem],
      };

      expect(plugin.updateSystems).toHaveLength(1);
      expect(plugin.renderSystems).toHaveLength(1);
    });

    it("should support plugin with commands", () => {
      const plugin: EditorPlugin = {
        name: "selection",
        commands: [
          {
            type: "selection:set",
            execute: vi.fn(),
          },
          {
            type: "selection:clear",
            execute: vi.fn(),
          },
        ],
      };

      expect(plugin.commands).toHaveLength(2);
      expect(plugin.commands![0].type).toBe("selection:set");
      expect(plugin.commands![1].type).toBe("selection:clear");
    });

    it("should support plugin lifecycle hooks", () => {
      const setup = vi.fn();
      const teardown = vi.fn();

      const plugin: EditorPlugin = {
        name: "lifecycle",
        setup,
        teardown,
      };

      expect(plugin.setup).toBe(setup);
      expect(plugin.teardown).toBe(teardown);
    });

    it("should support full-featured plugin", () => {
      const Block = new CanvasComponentDef(
        { name: "block" },
        {
          id: field.string().max(36),
          x: field.float64(),
          y: field.float64(),
        },
      );

      const Selected = new CanvasComponentDef(
        { name: "selected", sync: "ephemeral" },
        {},
      );

      const Camera = new CanvasSingletonDef(
        { name: "camera", sync: "ephemeral" },
        {
          x: field.float64().default(0),
          y: field.float64().default(0),
          zoom: field.float64().default(1),
        },
      );

      const plugin: EditorPlugin = {
        name: "infinite-canvas",
        dependencies: ["core"],
        components: [Block, Selected],
        singletons: [Camera],
        updateSystems: [defineSystem(() => {}), defineSystem(() => {})],
        renderSystems: [defineSystem(() => {})],
        commands: [
          { type: "canvas:pan", execute: vi.fn() },
          { type: "canvas:zoom", execute: vi.fn() },
          { type: "canvas:fit-to-screen", execute: vi.fn() },
        ],
        setup: vi.fn(),
        teardown: vi.fn(),
      };

      expect(plugin.name).toBe("infinite-canvas");
      expect(plugin.dependencies).toEqual(["core"]);
      expect(plugin.components).toHaveLength(2);
      expect(plugin.singletons).toHaveLength(1);
      expect(plugin.updateSystems).toHaveLength(2);
      expect(plugin.renderSystems).toHaveLength(1);
      expect(plugin.commands).toHaveLength(3);
      expect(plugin.setup).toBeDefined();
      expect(plugin.teardown).toBeDefined();
    });
  });

  describe("real-world plugin scenarios", () => {
    it("should support a core plugin", () => {
      const Block = new CanvasComponentDef(
        { name: "block" },
        {
          id: field.string().max(36),
          left: field.float64(),
          top: field.float64(),
          width: field.float64(),
          height: field.float64(),
          zIndex: field.int32().default(0),
        },
      );

      const corePlugin: EditorPlugin = {
        name: "core",
        components: [Block],
        renderSystems: [defineSystem(() => {})],
      };

      expect(corePlugin.name).toBe("core");
      expect(corePlugin.components![0].sync).toBe("none");
    });

    it("should support a selection plugin depending on core", () => {
      const Selected = new CanvasComponentDef(
        { name: "selected", sync: "ephemeral" },
        {},
      );
      const Hovered = new CanvasComponentDef({ name: "hovered" }, {});

      const selectionPlugin: EditorPlugin = {
        name: "selection",
        dependencies: ["core"],
        components: [Selected, Hovered],
        commands: [
          { type: "selection:select", execute: vi.fn() },
          { type: "selection:deselect", execute: vi.fn() },
          { type: "selection:toggle", execute: vi.fn() },
          { type: "selection:clear", execute: vi.fn() },
        ],
      };

      expect(selectionPlugin.dependencies).toContain("core");
      expect(selectionPlugin.components![0].sync).toBe("ephemeral");
      expect(selectionPlugin.components![1].sync).toBe("none");
    });

    it("should support a transform plugin depending on selection", () => {
      const Dragging = new CanvasComponentDef({ name: "dragging" }, {});
      const Resizing = new CanvasComponentDef({ name: "resizing" }, {});

      const transformPlugin: EditorPlugin = {
        name: "transform",
        dependencies: ["core", "selection"],
        components: [Dragging, Resizing],
        updateSystems: [defineSystem(() => {}), defineSystem(() => {})],
        commands: [
          { type: "transform:move", execute: vi.fn() },
          { type: "transform:resize", execute: vi.fn() },
        ],
      };

      expect(transformPlugin.dependencies).toContain("core");
      expect(transformPlugin.dependencies).toContain("selection");
    });

    it("should correctly order plugin chain", () => {
      const corePlugin: EditorPlugin = { name: "core" };
      const selectionPlugin: EditorPlugin = {
        name: "selection",
        dependencies: ["core"],
      };
      const transformPlugin: EditorPlugin = {
        name: "transform",
        dependencies: ["core", "selection"],
      };
      const appPlugin: EditorPlugin = {
        name: "app",
        dependencies: ["core", "selection", "transform"],
      };

      // Register in wrong order
      const plugins = [appPlugin, transformPlugin, selectionPlugin, corePlugin];
      const sorted = sortPluginsByDependencies(plugins);

      const names = sorted.map((p) => p.name);
      expect(names.indexOf("core")).toBeLessThan(names.indexOf("selection"));
      expect(names.indexOf("selection")).toBeLessThan(
        names.indexOf("transform"),
      );
      expect(names.indexOf("transform")).toBeLessThan(names.indexOf("app"));
    });
  });
});
