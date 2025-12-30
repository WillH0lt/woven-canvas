import { Key } from "./singletons/Keyboard";

import {
  RemoveSelected,
  SelectAll,
  BringForwardSelected,
  SendBackwardSelected,
  Cut,
  Copy,
  Paste,
} from "./commands";

/**
 * Plugin name for the Infinite Canvas plugin.
 * Used for plugin registration and resource lookup.
 */
export const PLUGIN_NAME = "infiniteCanvas";

/**
 * Default keybinds for the Infinite Canvas plugin.
 * These map key combinations to plugin commands.
 */
export const DEFAULT_KEYBINDS = [
  {
    command: Cut.name,
    key: Key.X,
    mod: true,
  },
  {
    command: Copy.name,
    key: Key.C,
    mod: true,
  },
  {
    command: Paste.name,
    key: Key.V,
    mod: true,
  },
  {
    command: RemoveSelected.name,
    key: Key.Delete,
  },
  {
    command: SelectAll.name,
    key: Key.A,
    mod: true,
  },
  {
    command: BringForwardSelected.name,
    key: Key.BracketRight,
  },
  {
    command: SendBackwardSelected.name,
    key: Key.BracketLeft,
  },
];
