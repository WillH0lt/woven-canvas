import { protectedProcedure, router } from '~/server/trpc/trpc.js';
import { EffectInputSchema } from '~/server/types.js';

const effectRouter = router({
  create: protectedProcedure.input(EffectInputSchema).mutation(async ({ ctx, input }) => {
    const { uid, prisma } = ctx;

    if (input.partId === null && input.groupId === null) {
      throw new Error('Part or Group id must be provided');
    } else if (input.partId !== null && input.groupId !== null) {
      throw new Error('Part and Group id cannot be provided at the same time');
    }

    const page = await prisma.page.findFirst({
      where: {
        id: input.pageId,
        createdBy: uid,
      },
    });

    if (!page) {
      throw new Error('Page not found');
    }

    const effect = await prisma.effect.create({
      data: {
        ...input,
        createdBy: uid,
      },
    });

    return effect;
  }),
});

export default effectRouter;
