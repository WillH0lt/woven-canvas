import * as routers from './routers/index.js';
import { router } from './trpc.js';

export const appRouter = router({
  ...routers,
});

export type AppRouter = typeof appRouter;
