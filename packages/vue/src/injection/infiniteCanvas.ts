import { type InjectionKey } from "vue";
import { type EntityId, type Editor } from "@infinitecanvas/editor";

/** User data stored in the users map */
export interface UserInfo {
  sessionId: string;
  color: string;
  name: string;
  avatar?: string;
}

/** Context provided by InfiniteCanvas */
export interface InfiniteCanvasContext {
  /** Check if an entity exists */
  hasEntity: (entityId: EntityId) => boolean;
  /** Get the editor instance */
  getEditor: () => Editor | null;
  /** Get the current user's sessionId */
  getSessionId: () => string;
  /** Get a user's info by their session ID */
  getUserBySessionId: (sessionId: string) => UserInfo | null;
  /** Subscribe to component changes for an entity. Returns unsubscribe function. */
  subscribeComponent: (
    entityId: EntityId,
    componentName: string,
    callback: (value: unknown) => void
  ) => () => void;
  /** Subscribe to singleton changes. Returns unsubscribe function. */
  subscribeSingleton: (
    singletonName: string,
    callback: (value: unknown) => void
  ) => () => void;
  /** Register a callback to be called on each tick. Returns unregister function. */
  registerTickCallback: (callback: () => void) => () => void;
}

/** Injection key for InfiniteCanvas context */
export const INFINITE_CANVAS_KEY: InjectionKey<InfiniteCanvasContext> =
  Symbol("infinite-canvas");
