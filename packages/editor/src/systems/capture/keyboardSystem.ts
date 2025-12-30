import {
  defineSystem,
  type Context,
  createEntity,
  addComponent,
} from "@infinitecanvas/ecs";
import { CommandMarker } from "../../command";
import { Keyboard } from "../../singletons";
import { PLUGIN_NAME } from "../../constants";
import { getPluginResources, type InfiniteCanvasResources } from "../../types";

/**
 * Keyboard capture system - handles keybind-to-command mapping.
 *
 * Listens for keyboard input and spawns commands based on
 * the plugin's keybind configuration.
 */
export const keyboardSystem = defineSystem((ctx: Context) => {
  const keyboard = Keyboard.read(ctx);
  const resources = getPluginResources<InfiniteCanvasResources>(
    ctx,
    PLUGIN_NAME
  );

  for (const keybind of resources.keybinds) {
    // Check if key was just pressed
    let triggered = Keyboard.isKeyDownTrigger(ctx, keybind.key);

    // Check modifier keys
    triggered &&= !!keybind.mod === keyboard.modDown;
    triggered &&= !!keybind.shift === keyboard.shiftDown;

    if (triggered) {
      // Spawn the command by name\
      const eid = createEntity(ctx);
      addComponent(ctx, eid, CommandMarker, { name: keybind.command });

      break;
    }
  }
});
