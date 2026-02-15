import { describe, it, expect } from "vitest";
import { createApp, h } from "vue";
import { useQuery } from "../src/composables/useQuery";
import { defineCanvasComponent, field } from "@infinitecanvas/editor";

describe("useQuery", () => {
  // Create a test component definition
  const Block = defineCanvasComponent({ name: "Block" }, {
    position: field.tuple(field.float64(), 2).default([0, 0]),
    size: field.tuple(field.float64(), 2).default([100, 100]),
  });

  describe("error handling", () => {
    it("should throw error when used outside InfiniteCanvas", () => {
      expect(() => {
        const app = createApp({
          setup() {
            useQuery([Block]);
            return () => h("div");
          },
        });
        app.mount(document.createElement("div"));
      }).toThrow("useQuery must be used within an InfiniteCanvas component");
    });
  });

  // Note: Most useQuery functionality tests require a real Editor instance
  // because defineQuery needs the ECS context with registered components.
  // Integration tests with InfiniteCanvas would cover the full query functionality.
});
