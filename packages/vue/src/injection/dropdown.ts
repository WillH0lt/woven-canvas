import type { InjectionKey, Ref } from 'vue'

// Injection keys for dropdown coordination
// Tracks active dropdown ID at each nesting level (only one open per level)
export const DROPDOWN_ACTIVE_KEY: InjectionKey<Ref<Map<number, string>>> = Symbol.for(
  '__woven_canvas_dropdown_active__',
)
export const DROPDOWN_LEVEL_KEY: InjectionKey<number> = Symbol.for('__woven_canvas_dropdown_level__')
