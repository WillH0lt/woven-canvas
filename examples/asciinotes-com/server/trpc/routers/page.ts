import { ScrollDirection } from '@prisma/client';
import { z } from 'zod';

// import { emailQueue } from '~/server/tasks/screenshots.js';
import { blankTemplate } from '~/server/templates.js';
import { protectedProcedure, router } from '~/server/trpc/trpc.js';
import {
  EffectInputSchema,
  GroupInputSchema,
  PageUpdateSchema,
  PartInputSchema,
  TileInputSchema,
} from '~/server/types.js';
import { assertActiveSubscription } from '~/server/utils/plans.js';

const pageRouter = router({
  get: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
        versionId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: {
          id: input.pageId,
          createdBy: uid,
          versionId: input.versionId,
        },
        include: {
          parts: {
            include: {
              effects: true,
            },
          },
          groups: {
            include: {
              effects: true,
            },
          },
          tiles: true,
          linkStyles: true,
        },
      });

      if (!page) {
        throw new Error('Page not found');
      }

      return page;
    }),
  create: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const site = await prisma.site.findFirst({
        where: {
          id: input.siteId,
          createdBy: uid,
        },
        include: {
          pages: {
            where: {
              versionId: null,
            },
          },
        },
      });

      if (!site) {
        throw new Error('Site not found');
      }

      if (site.pages.length >= 3) {
        await assertActiveSubscription(input.siteId, uid);
      }

      let path = 'page';
      let i = 1;
      const isPathTaken = (p: string): boolean => site.pages.some((page) => page.path === p);
      while (isPathTaken(path)) {
        i++;
        path = `page-${i}`;
      }

      const page = await prisma.page.create({
        data: {
          createdBy: uid,
          siteId: input.siteId,
          path,
          title: '',
          description: '',
          ogImage: '',
          backgroundColor: '#ffffff',
          scrollDirection: ScrollDirection.Vertical,
          minWidth: 500,
          maxWidth: 0,
          minHeight: 500,
          maxHeight: 0,
          linkStyles: {
            create: [
              {
                ...blankTemplate.linkStyle,
                createdBy: uid,
                className: randomSlug(12),
              },
            ],
          },
        },
      });

      return page;
    }),
  update: protectedProcedure.input(PageUpdateSchema).mutation(async ({ input, ctx }) => {
    const { prisma, uid } = ctx;

    const page = await prisma.page.findFirst({
      where: { id: input.pageId, createdBy: uid },
    });

    if (!page) {
      throw new Error('Page not found');
    }

    if (page.path === '' && input.updates.path !== undefined) {
      throw new Error('Cannot change path of home page');
    }

    // update links to this page if path changes
    if (input.updates.path !== undefined && input.updates.path !== page.path) {
      const linkingParts = await prisma.part.findMany({
        where: {
          page: {
            siteId: page.siteId,
            versionId: null,
          },
          innerHtml: {
            contains: `href="/${page.path}"`,
          },
        },
      });

      await prisma.$transaction(async (tx) => {
        await Promise.all(
          linkingParts.map(async (part) => {
            const updatedHtml = part.innerHtml.replace(
              new RegExp(`href="/${page.path}"`, 'g'),
              `href="/${input.updates.path}"`,
            );

            return tx.part.update({
              where: {
                id: part.id,
                pageId: part.pageId,
              },
              data: {
                innerHtml: updatedHtml,
              },
            });
          }),
        );
      });
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const page = await prisma.page.findFirst({
        where: { id: input.pageId, createdBy: uid },
      });

      if (!page) {
        throw new Error('Page not found');
      }

      if (page.path === '') {
        throw new Error('Cannot delete home page');
      }

      return prisma.page.delete({
        where: { id: input.pageId, createdBy: uid },
      });
    }),
  applyDelta: protectedProcedure
    .input(
      z.object({
        addedParts: PartInputSchema.array(),
        updatedParts: PartInputSchema.array(),
        removedParts: PartInputSchema.array(),
        addedEffects: EffectInputSchema.array(),
        updatedEffects: EffectInputSchema.array(),
        removedEffects: EffectInputSchema.array(),
        addedTiles: TileInputSchema.array(),
        updatedTiles: TileInputSchema.array(),
        removedTiles: TileInputSchema.array(),
        addedGroups: GroupInputSchema.array(),
        updatedGroups: GroupInputSchema.array(),
        removedGroups: GroupInputSchema.array(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { uid, prisma } = ctx;

      const updatedPageIds = new Set([
        ...input.addedParts.map((part) => part.pageId),
        ...input.updatedParts.map((part) => part.pageId),
        ...input.removedParts.map((part) => part.pageId),
        ...input.addedGroups.map((group) => group.pageId),
        ...input.updatedGroups.map((group) => group.pageId),
        ...input.removedGroups.map((group) => group.pageId),
        ...input.addedTiles.map((tile) => tile.pageId),
        ...input.updatedTiles.map((tile) => tile.pageId),
        ...input.removedTiles.map((tile) => tile.pageId),
        ...input.addedEffects.map((effect) => effect.pageId),
        ...input.updatedEffects.map((effect) => effect.pageId),
        ...input.removedEffects.map((effect) => effect.pageId),
      ]);

      if (updatedPageIds.size > 1) {
        throw new Error('Parts, groups, effects, and tiles must all be on the same page');
      } else if (updatedPageIds.size === 0) {
        throw new Error('No delta provided');
      }

      const page = await prisma.page.findFirst({
        where: {
          id: Array.from(updatedPageIds)[0],
          createdBy: uid,
        },
      });

      if (!page) {
        throw new Error('Page not found');
      }

      await prisma.$transaction(async (tx) => {
        // === Site ===
        await tx.site.update({
          where: {
            id: page.siteId,
            createdBy: uid,
          },
          data: {
            editedAt: new Date(),
          },
        });

        // === Groups ===

        if (input.addedGroups.length > 0) {
          await tx.group.createMany({
            data: input.addedGroups.map((group) => ({
              ...group,
              createdBy: uid,
            })),
          });
        }

        await Promise.all(
          input.updatedGroups.map(async (updatedGroup) =>
            tx.group.update({
              where: {
                id: updatedGroup.id,
                createdBy: uid,
              },
              data: {
                ...updatedGroup,
                createdBy: uid,
              },
            }),
          ),
        );

        if (input.removedGroups.length > 0) {
          await tx.group.deleteMany({
            where: {
              id: { in: input.removedGroups.map((group) => group.id) },
              createdBy: uid,
            },
          });
        }

        // === Parts ===

        if (input.addedParts.length > 0) {
          await tx.part.createMany({
            data: input.addedParts.map((part) => ({
              ...part,
              createdBy: uid,
            })),
          });
        }

        await Promise.all(
          input.updatedParts.map(async (updatedPart) =>
            tx.part.update({
              where: {
                id: updatedPart.id,
                createdBy: uid,
              },
              data: {
                ...updatedPart,
                createdBy: uid,
              },
            }),
          ),
        );

        if (input.removedParts.length > 0) {
          await tx.part.deleteMany({
            where: {
              id: { in: input.removedParts.map((part) => part.id) },
              createdBy: uid,
            },
          });
        }

        // === Effects ===

        if (input.addedEffects.length > 0) {
          await tx.effect.createMany({
            data: input.addedEffects.map((effect) => ({
              ...effect,
              createdBy: uid,
            })),
          });
        }

        await Promise.all(
          input.updatedEffects.map(async (updatedEffect) =>
            tx.effect.update({
              where: {
                id: updatedEffect.id,
                createdBy: uid,
              },
              data: {
                ...updatedEffect,
                createdBy: uid,
              },
            }),
          ),
        );

        if (input.removedEffects.length > 0) {
          await tx.effect.deleteMany({
            where: {
              id: { in: input.removedEffects.map((effect) => effect.id) },
              createdBy: uid,
            },
          });
        }

        // === Tiles ===

        if (input.addedTiles.length > 0) {
          await tx.tile.createMany({
            data: input.addedTiles.map((tile) => ({
              ...tile,
              createdBy: uid,
            })),
          });
        }

        await Promise.all(
          input.updatedTiles.map(async (updatedTile) =>
            tx.tile.update({
              where: {
                id: updatedTile.id,
                createdBy: uid,
              },
              data: {
                ...updatedTile,
                createdBy: uid,
              },
            }),
          ),
        );

        if (input.removedTiles.length > 0) {
          await tx.tile.deleteMany({
            where: {
              id: { in: input.removedTiles.map((tile) => tile.id) },
              createdBy: uid,
            },
          });
        }
      });

      runTask('screenshot', {
        payload: { page, session: ctx.session },
      }).catch((err: unknown) => {
        console.error('Error screenshots:', err);
      });

      return true;
    }),
});

export default pageRouter;
