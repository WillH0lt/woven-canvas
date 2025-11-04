import superjson from 'superjson';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import type { AppRouter } from '~/server/trpc/routers';

export default defineNuxtPlugin(() => {
  const client = createTRPCNuxtClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: '/api/trpc',
      }),
    ],
  });

  return {
    provide: {
      client,
    },
  };
});

export type client = ReturnType<typeof createTRPCNuxtClient<AppRouter>>;
