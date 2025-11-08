import { createTRPCNuxtHandler } from "trpc-nuxt/server";

import { createContext } from "../../trpc/context";
import { appRouter } from "../../trpc/routers";

// export API handler
export default createTRPCNuxtHandler({
  router: appRouter,
  createContext,
});
