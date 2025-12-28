import { z } from "zod";

import { protectedProcedure, router } from "../trpc";
import {
  PageNameUpdateSchema,
  PageShareModeUpdateSchema,
  PageCreateSchema,
} from "../schemas";
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
          uid,
        },
      });

      // if (pageCount >= 3) {
      //   await assertActiveSubscription(uid);
      // }

      const page = await prisma.page.create({
        data: {
          ...input.page,
          uid,
        },
      });

      return await prisma.userPage.create({
        data: {
          ...input.userPage,
          uid,
          pageId: page.id,
        },
        include: { page: true },
      });
    }),
  updateName: protectedProcedure
    .input(PageNameUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: {
          id: input.pageId,
          OR: [{ uid }, { shareMode: "ReadWrite" }],
        },
      });

      if (!page) {
        throw new Error("Page not found or insufficient permissions");
      }

      return prisma.page.update({
        where: { id: input.pageId },
        data: {
          ...input.updates,
        },
      });
    }),
  updateShareMode: protectedProcedure
    .input(PageShareModeUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: {
          id: input.pageId,
          uid,
        },
      });

      if (!page) {
        throw new Error("Page not found or insufficient permissions");
      }

      return prisma.page.update({
        where: { id: input.pageId },
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
        where: { id: input.pageId, uid },
      });

      if (!page) {
        throw new Error("Page not found");
      }

      return prisma.page.delete({
        where: { id: input.pageId, uid },
      });
    }),
});

export default pageRouter;
