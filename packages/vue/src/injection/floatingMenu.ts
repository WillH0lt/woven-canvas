import { type InjectionKey, type ComputedRef } from "vue";
import { type EntityId } from "@infinitecanvas/editor";

/** Context provided by FloatingMenu */
export interface FloatingMenuContext {
  selectedIds: ComputedRef<EntityId[]>;
  commonComponents: ComputedRef<Set<string>>;
}

/** Injection key for FloatingMenu context */
export const FLOATING_MENU_KEY: InjectionKey<FloatingMenuContext> =
  Symbol("floating-menu");
