import type { Placement, UseFloatingReturn } from '@floating-ui/vue';
import { autoUpdate, flip, hide, offset, shift, useFloating } from '@floating-ui/vue';
import type { ShallowRef } from 'vue';

export const useMenus = (
  reference: Readonly<ShallowRef<HTMLElement | null>>,
  floating: Readonly<ShallowRef<HTMLElement | null>>,
  options: { placement?: Placement; offset?: number } = {},
): UseFloatingReturn =>
  useFloating(reference, floating, {
    whileElementsMounted: autoUpdate,
    placement: options.placement,
    middleware: [offset(options.offset ?? 40), shift(), flip(), hide()],
  });
