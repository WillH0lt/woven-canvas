import {
  getResources,
  MainThreadSystem,
  createEntity,
  addComponent,
} from "@infinitecanvas/ecs";

import type { EditorPlugin } from "./plugin";
import type { EditorResources } from "./types";
import {
  EditorComponentDef,
  type AnyEditorComponentDef,
} from "./EditorComponentDef";
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

import { Synced, User } from "./components";
import * as components from "./components";
import * as singletons from "./singletons";
import * as input from "./systems/input";
import * as preInput from "./systems/preInput";
import * as preCapture from "./systems/preCapture";
import * as preRender from "./systems/preRender";
import * as capture from "./systems/capture";
import * as postRender from "./systems/postRender";

import { PLUGIN_NAME } from "./constants";

function filterForMainThreadSystems(
  systems: Record<string, unknown>
): MainThreadSystem[] {
  return Object.values(systems).filter(
    (v): v is MainThreadSystem => v instanceof MainThreadSystem
  );
}

/**
 * Core plugin - handles core input and camera functionality.
 */
export const CorePlugin: EditorPlugin = {
  name: PLUGIN_NAME,

  singletons: Object.values(singletons).filter(
    (v): v is EditorSingletonDef<any> => v instanceof EditorSingletonDef
  ),

  components: Object.values(components).filter(
    (v) => v instanceof EditorComponentDef
  ) as AnyEditorComponentDef[],

  preInputSystems: filterForMainThreadSystems(preInput),

  inputSystems: filterForMainThreadSystems(input),

  preCaptureSystems: filterForMainThreadSystems(preCapture),

  captureSystems: filterForMainThreadSystems(capture),

  preRenderSystems: filterForMainThreadSystems(preRender),

  postRenderSystems: filterForMainThreadSystems(postRender),

  setup(ctx) {
    const { domElement, sessionId, userId } =
      getResources<EditorResources>(ctx);

    // Attach all event listeners
    attachKeyboardListeners(domElement);
    attachMouseListeners(domElement);
    attachScreenObserver(domElement);
    attachPointerListeners(domElement);

    // Create the user entity for presence tracking
    const userEntity = createEntity(ctx);
    addComponent(ctx, userEntity, Synced, {
      id: sessionId,
    });
    addComponent(ctx, userEntity, User, {
      id: userId,
    });
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
