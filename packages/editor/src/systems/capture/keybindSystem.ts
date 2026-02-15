import {
  type Context,
  createEntity,
  addComponent,
  getResources,
} from "@woven-ecs/core";

import { defineEditorSystem } from "../../EditorSystem";
import { Keyboard } from "../../singletons";
import { CommandMarker } from "../../command";
import type { EditorResources } from "../../types";

/**
 * Keybind capture system - handles keybind-to-command mapping.
 *
 * Listens for keyboard input and spawns commands based on
 * the plugin's keybind configuration.
 */
export const keybindSystem = defineEditorSystem({ phase: "capture" }, (ctx: Context) => {
  const keyboard = Keyboard.read(ctx);
  const { editor } = getResources<EditorResources>(ctx);

  for (const keybind of editor.keybinds) {
    // Check if key was just pressed
    let triggered = Keyboard.isKeyDownTrigger(ctx, keybind.key);

    // Check modifier keys
    triggered &&= !!keybind.mod === keyboard.modDown;
    triggered &&= !!keybind.shift === keyboard.shiftDown;

    if (triggered) {
      // Spawn the command by name
      const eid = createEntity(ctx);
      addComponent(ctx, eid, CommandMarker, { name: keybind.command });

      break;
    }
  }
});
