import {
  defineSystem,
  type Context,
  createEntity,
  addComponent,
} from "@infinitecanvas/ecs";

import { Keyboard } from "../../singletons";
import { CommandMarker } from "../../command";
import { PLUGIN_NAME } from "../../constants";
import { type EditorResources, getPluginResources } from "../../types";

/**
 * Keyboard capture system - handles keybind-to-command mapping.
 *
 * Listens for keyboard input and spawns commands based on
 * the plugin's keybind configuration.
 */
export const keyboardSystem = defineSystem((ctx: Context) => {
  const keyboard = Keyboard.read(ctx);
  const { editor } = getPluginResources<EditorResources>(ctx, PLUGIN_NAME);

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
