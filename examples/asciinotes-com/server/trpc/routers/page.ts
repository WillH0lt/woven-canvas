import { z } from "zod";

import { protectedProcedure, router } from "../trpc";
import { PageUpdateSchema, PageCreateSchema } from "../schemas";
import { assertActiveSubscription } from "../../utils/plans";
import { UserPageCreateSchema } from "../schemas/userPage";

const pageRouter = router({
  createWithUserPage: protectedProcedure
    .input(
      z.object({
        page: PageCreateSchema,
        userPage: UserPageCreateSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const pageCount = await prisma.page.count({
        where: {
          createdBy: uid,
        },
      });

      // if (pageCount >= 3) {
      //   await assertActiveSubscription(uid);
      // }

      const page = await prisma.page.create({
        data: {
          ...input.page,
          createdBy: uid,
        },
      });

      return await prisma.userPage.create({
        data: {
          ...input.userPage,
          uid: uid,
          pageId: page.id,
        },
        include: { page: true },
      });
    }),
  update: protectedProcedure
    .input(PageUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: { id: input.pageId, createdBy: uid },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      return prisma.page.update({
        where: { id: input.pageId, createdBy: uid },
        data: {
          ...input.updates,
        },
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: { id: input.pageId, createdBy: uid },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      return prisma.page.delete({
        where: { id: input.pageId, createdBy: uid },
      });
    }),
});

export default pageRouter;
