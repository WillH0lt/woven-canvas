/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from '~/server/trpc/context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (ctx.uid === null) throw new TRPCError({ code: 'UNAUTHORIZED' });

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
