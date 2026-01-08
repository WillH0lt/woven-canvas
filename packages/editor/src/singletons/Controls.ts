import { field, type Context } from "@infinitecanvas/ecs";
import { EditorSingletonDef } from "../EditorSingletonDef";
import { PointerButton } from "../components";

const ControlsSchema = {
  /** Tool activated by left mouse button */
  leftMouseTool: field.string().max(32).default("select"),
  /** Tool activated by middle mouse button */
  middleMouseTool: field.string().max(32).default("hand"),
  /** Tool activated by right mouse button */
  rightMouseTool: field.string().max(32).default("menu"),
  /** Tool activated by mouse wheel */
  wheelTool: field.string().max(32).default("scroll"),
  /** Tool activated by mouse wheel with modifier key held */
  modWheelTool: field.string().max(32).default("zoom"),
  /** JSON snapshot of block to place on next click (empty string = no placement active) */
  heldSnapshot: field.string().max(4096).default(""),
};

/**
 * Controls singleton - maps input methods to tools.
 *
 * This allows applications to define their own tools (select, brush, hand, etc.)
 * and configure which mouse buttons or wheel actions activate them.
 */
class ControlsDef extends EditorSingletonDef<typeof ControlsSchema> {
  constructor() {
    super("controls", ControlsSchema, { sync: "none" });
  }

  /**
   * Get the pointer buttons that are mapped to the given tools.
   * @param ctx - ECS context
   * @param tools - Tool names to check
   * @returns Array of PointerButton values that activate any of the given tools
   */
  getButtons(ctx: Context, ...tools: string[]): PointerButton[] {
    const controls = this.read(ctx);
    const buttons: PointerButton[] = [];

    if (tools.includes(controls.leftMouseTool)) {
      buttons.push(PointerButton.Left);
    }
    if (tools.includes(controls.middleMouseTool)) {
      buttons.push(PointerButton.Middle);
    }
    if (tools.includes(controls.rightMouseTool)) {
      buttons.push(PointerButton.Right);
    }

    return buttons;
  }

  /**
   * Check if a wheel tool is active based on modifier key state.
   * @param ctx - ECS context
   * @param tool - Tool name to check
   * @param modDown - Whether the modifier key is held
   * @returns True if the given tool is active for wheel input
   */
  wheelActive(ctx: Context, tool: string, modDown: boolean): boolean {
    const controls = this.read(ctx);
    return (
      (controls.wheelTool === tool && !modDown) ||
      (controls.modWheelTool === tool && modDown)
    );
  }
}

export const Controls = new ControlsDef();
