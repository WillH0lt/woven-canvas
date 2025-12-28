import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (ctx.uid === null) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({
    ctx: {
      uid: ctx.uid,
    },
  });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);

export const router = t.router;
export const middleware = t.middleware;
