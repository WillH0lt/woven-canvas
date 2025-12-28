import { Key } from "@infinitecanvas/editor";

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
