import { z } from 'zod';

// import { emailQueue } from '~/server/tasks/screenshots.js';
import { protectedProcedure, router } from '~/server/trpc/trpc.js';
import { LinkStyleInputSchema } from '~/server/types.js';

import { randomSlug } from '~/server/utils/slug.js';

const linkStyleRouter = router({
  create: protectedProcedure.input(LinkStyleInputSchema).mutation(async ({ input, ctx }) => {
    const { prisma, uid } = ctx;

    const page = await prisma.page.findFirst({
      where: {
        id: input.pageId,
        createdBy: uid,
      },
      include: {
        linkStyles: true,
      },
    });

    if (!page) {
      throw new Error('Page not found');
    }

    let name = input.name;
    if (name === undefined) {
      let i = 0;
      const isNameTaken = (n: string): boolean => page.linkStyles.some((style) => style.name === n);
      do {
        i++;
        name = `Style ${i}`;
      } while (isNameTaken(name));
    }

    const linkStyle = await prisma.linkStyle.create({
      data: {
        ...input,
        createdBy: uid,
        name,
        isDefault: false,
        className: randomSlug(12),
      },
    });

    return linkStyle;
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: LinkStyleInputSchema.omit({ pageId: true }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const linkStyle = await prisma.linkStyle.findFirst({
        where: {
          id: input.id,
          createdBy: uid,
        },
      });

      if (!linkStyle) {
        throw new Error('Link style not found');
      }

      return prisma.linkStyle.update({
        where: { id: input.id },
        data: input.updates,
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const linkStyle = await prisma.linkStyle.findFirst({
        where: {
          id: input.id,
          createdBy: uid,
        },
      });

      if (!linkStyle) {
        throw new Error('Link style not found');
      }

      if (linkStyle.isDefault) {
        throw new Error('Cannot delete default link style');
      }

      return prisma.linkStyle.delete({
        where: { id: input.id },
      });
    }),
});

export default linkStyleRouter;
