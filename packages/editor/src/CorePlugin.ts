import { getResources, MainThreadSystem } from "@infinitecanvas/ecs";

import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";
import { EditorComponentDef } from "./EditorComponentDef";
import { EditorSingletonDef } from "./EditorSingletonDef";
import {
  attachKeyboardListeners,
  detachKeyboardListeners,
  attachMouseListeners,
  detachMouseListeners,
  attachScreenObserver,
  detachScreenObserver,
  attachPointerListeners,
  detachPointerListeners,
} from "./systems/input";

import * as components from "./components";
import * as singletons from "./singletons";
import * as input from "./systems/input";

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: "core",

  singletons: Object.values(singletons).filter(
    (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
  ),

  components: Object.values(components).filter(
    (v): v is EditorComponentDef<any> => v instanceof EditorComponentDef
  ),

  inputSystems: Object.values(input).filter(
    (v): v is MainThreadSystem => v instanceof MainThreadSystem
  ),

  setup(ctx) {
    const { domElement } = getResources<EditorResources>(ctx);

    // Attach all event listeners
    attachKeyboardListeners(domElement);
    attachMouseListeners(domElement);
    attachScreenObserver(domElement);
    attachPointerListeners(domElement);
  },

  teardown(ctx) {
    const { domElement } = getResources<EditorResources>(ctx);

    // Detach all event listeners
    detachKeyboardListeners(domElement);
    detachMouseListeners(domElement);
    detachScreenObserver(domElement);
    detachPointerListeners(domElement);
  },
};
