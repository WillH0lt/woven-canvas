import { z } from 'zod';

import { protectedProcedure, router } from '~/server/trpc/trpc.js';

const versionRouter = router({
  delete: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { uid, prisma } = ctx;

      const version = await prisma.version.findFirst({
        where: {
          id: input.versionId,
          createdBy: uid,
        },
        include: {
          site: true,
        },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      await prisma.version.delete({
        where: {
          id: input.versionId,
          createdBy: uid,
        },
      });

      // change live version id to latest version
      if (version.site.liveVersionId === input.versionId) {
        const latestVersion = await prisma.version.findFirst({
          where: {
            siteId: version.siteId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return prisma.site.update({
          where: { id: version.siteId },
          data: {
            liveVersionId: latestVersion?.id,
          },
        });
      }

      return version.site;
    }),
  deploy: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { uid, prisma } = ctx;

      const version = await prisma.version.findFirst({
        where: {
          id: input.versionId,
          createdBy: uid,
        },
        include: {
          site: true,
        },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      return prisma.site.update({
        where: { id: version.siteId },
        data: {
          liveVersionId: version.id,
        },
      });
    }),
});

export default versionRouter;
