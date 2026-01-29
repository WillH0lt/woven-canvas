import { defineComponent, field } from "@infinitecanvas/ecs";

export const Synced = defineComponent({
  id: field.string().max(36),
});
