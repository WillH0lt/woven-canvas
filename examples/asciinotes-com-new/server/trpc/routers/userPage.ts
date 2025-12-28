import { z } from "zod";

import { protectedProcedure, router } from "../trpc";
import { UserPageUpdateSchema } from "../schemas";

const userPageRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { prisma, uid } = ctx;

    return await prisma.userPage.findMany({
      where: { uid },
      orderBy: { rank: "asc" },
      include: { page: true },
    });
  }),
  update: protectedProcedure
    .input(UserPageUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const userPage = await prisma.userPage.findFirst({
        where: { pageId: input.pageId, uid },
      });

      if (!userPage) {
        throw new Error("UserPage not found");
      }

      return prisma.userPage.update({
        where: { id: userPage.id },
        data: {
          ...input.updates,
        },
      });
    }),
  forget: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const userPage = await prisma.userPage.findFirst({
        where: { pageId: input.pageId, uid },
        include: { page: true },
      });

      if (!userPage) {
        throw new Error("UserPage not found");
      }

      if (userPage.page.uid === uid) {
        throw new Error("Cannot forget your own page");
      }

      return prisma.userPage.delete({
        where: { id: userPage.id },
      });
    }),
});

export default userPageRouter;
