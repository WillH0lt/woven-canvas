import {
  type Context,
  defineQuery,
  getResources,
  type EntityId,
} from "@infinitecanvas/ecs";
import { User } from "../components/User";
import type { EditorResources } from "../types";

const userQuery = defineQuery((q) => q.with(User));

export function getMyUserEntityId(ctx: Context): EntityId | null {
  const mySessionId = getResources<EditorResources>(ctx).sessionId;

  for (const eid of userQuery.current(ctx)) {
    const user = User.read(ctx, eid);
    if (user.sessionId === mySessionId) {
      return eid;
    }
  }

  return null;
}
