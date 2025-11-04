import omit from 'lodash.omit';
import { z } from 'zod';

import { blankTemplate } from '~/server/templates.js';
import { protectedProcedure, publicProcedure, router } from '~/server/trpc/trpc.js';
import { SiteUpdateSchema } from '~/server/types.js';
import { randomSlug } from '~/server/utils/slug.js';

const siteRouter = router({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const { uid, prisma } = ctx;

    const slug = randomSlug(12);

    const site = await prisma.site.create({
      data: {
        slug,
        name: 'Untitled',
        title: '',
        description: '',
        googleAnalyticsId: '',
        favicon: '',
        ogImage: '',
        createdBy: uid,
        pages: {
          create: blankTemplate.pages.map((page) => ({
            ...page,
            createdBy: uid,
            linkStyles: {
              create: [
                {
                  ...blankTemplate.linkStyle,
                  createdBy: uid,
                  className: randomSlug(12),
                },
              ],
            },
          })),
        },
      },
      include: {
        pages: true,
      },
    });

    return site;
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { prisma, uid } = ctx;
    return prisma.site.findMany({
      where: { createdBy: uid },
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          where: { versionId: null, path: '' },
        },
      },
    });
  }),
  getByPageId: protectedProcedure
    .input(
      z.object({
        pageId: z.string(),
        versionId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { prisma, uid } = ctx;

      const site = await prisma.site.findFirst({
        where: {
          pages: {
            some: {
              id: input.pageId,
              versionId: input.versionId,
              createdBy: uid,
            },
          },
        },
        include: {
          pages: {
            where: {
              versionId: input.versionId,
            },
          },
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!site) {
        throw new Error('Site not found');
      }

      return site;
    }),
  getPreview: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        path: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
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
              path: input.path,
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
          },
        },
      });

      if (!site) {
        throw new Error('Site not found');
      }

      return site;
    }),
  get: publicProcedure
    .input(
      z.object({
        domain: z.string(),
        path: z.string(),
        siteSlug: z.string().nullable(),
        versionSlug: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { prisma } = ctx;

      const useDomain =
        !input.domain.endsWith('localhost') && !input.domain.endsWith('scrolly.page');
      if (!useDomain && input.siteSlug === null) {
        throw new Error('Site slug required if not using a custom domain');
      }

      let versionId: string | null = null;
      if (input.versionSlug === 'live') {
        const site = await prisma.site.findFirst({
          where: {
            ...(useDomain ? { domain: input.domain } : {}),
            ...(input.siteSlug !== null ? { slug: input.siteSlug } : {}),
          },
        });

        if (site?.liveVersionId === null) {
          throw new Error('Site not found');
        }

        versionId = site?.liveVersionId ?? null;
      } else {
        const version = await prisma.version.findFirst({
          where: {
            slug: input.versionSlug,
          },
        });

        if (!version) {
          throw new Error('Version not found');
        }

        versionId = version.id;
      }

      const site = await prisma.site.findFirst({
        where: {
          ...(useDomain ? { domain: input.domain } : {}),
          ...(input.siteSlug !== null ? { slug: input.siteSlug } : {}),
        },
        include: {
          pages: {
            where: {
              path: input.path,
              versionId,
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
          },
        },
      });

      if (!site) {
        throw new Error('Site not found');
      }

      if (site.pages.length === 0) {
        throw new Error('Page not found');
      }

      return site;
    }),
  delete: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const { prisma, uid } = ctx;

    return prisma.site.delete({ where: { id: input, createdBy: uid } });
  }),
  update: protectedProcedure.input(SiteUpdateSchema).mutation(async ({ input, ctx }) => {
    const { prisma, uid } = ctx;

    const site = await prisma.site.findFirst({
      where: {
        id: input.siteId,
        createdBy: uid,
      },
    });

    if (!site) {
      throw new Error('Site not found');
    }

    if (input.updates.domain !== undefined) {
      await assertActiveSubscription(input.siteId, uid);

      if (input.updates.domain !== site.domain) {
        if (site.domain !== null) {
          await deleteCertificate(site.domain);
        }

        if (input.updates.domain !== null) {
          await createCertificate(input.updates.domain);
        }
      }
    }

    return prisma.site.update({
      where: { id: input.siteId, createdBy: uid },
      data: {
        ...input.updates,
      },
    });
  }),
  slugIsUnique: publicProcedure
    .input(z.object({ slug: z.string(), siteId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { prisma } = ctx;

      const site = await prisma.site.findFirst({
        where: {
          slug: input.slug,
          id: { not: input.siteId },
        },
      });

      return !site;
    }),
  publish: protectedProcedure
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
            where: {
              versionId: null,
            },
          },
        },
      });

      if (!site) {
        throw new Error('Site not found');
      }

      const version = await prisma.version.create({
        data: {
          siteId: input.siteId,
          createdBy: uid,
          slug: randomSlug(12),
        },
      });

      // duplicate pages with new parts, effects, tiles, and groups
      await prisma.$transaction(async (tx) => {
        const newPages = await tx.page.createManyAndReturn({
          data: site.pages.map((page) => ({
            ...omit(page, ['id', 'parts', 'groups', 'tiles', 'linkStyles']),
            versionId: version.id,
          })),
        });

        // duplicate groups
        const newGroups = await tx.group.createManyAndReturn({
          data: site.pages.flatMap((page, pageIdx) =>
            page.groups.map((group) => ({
              ...omit(group, ['id', 'effects']),
              pageId: newPages[pageIdx].id,
            })),
          ),
        });

        const oldGroups = site.pages.flatMap((page) => page.groups);
        const groupIdMap = new Map(
          oldGroups.map((oldGroup, idx) => [oldGroup.id, newGroups[idx].id]),
        );

        // duplicate group effects
        await tx.effect.createMany({
          data: site.pages.flatMap((page, pageIdx) =>
            page.groups.flatMap((group) =>
              group.effects.map((effect) => ({
                ...omit(effect, ['id']),
                pageId: newPages[pageIdx].id,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                groupId: groupIdMap.get(effect.groupId!),
              })),
            ),
          ),
        });

        // duplicate parts
        const newParts = await tx.part.createManyAndReturn({
          data: site.pages.flatMap((page, pageIdx) =>
            page.parts.map((part) => ({
              ...omit(part, ['id', 'effects']),
              groupId: part.groupId === null ? null : groupIdMap.get(part.groupId),
              pageId: newPages[pageIdx].id,
            })),
          ),
        });

        // duplicate part effects
        const oldParts = site.pages.flatMap((page) => page.parts);
        const partIdMap = new Map(oldParts.map((oldPart, idx) => [oldPart.id, newParts[idx].id]));
        await tx.effect.createMany({
          data: site.pages.flatMap((page, pageIdx) =>
            page.parts.flatMap((part) =>
              part.effects.map((effect) => ({
                ...omit(effect, ['id']),
                pageId: newPages[pageIdx].id,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                partId: partIdMap.get(effect.partId!),
              })),
            ),
          ),
        });

        // duplicate tiles
        await tx.tile.createMany({
          data: site.pages.flatMap((page, pageIdx) =>
            page.tiles.map((tile) => ({
              ...omit(tile, ['id']),
              pageId: newPages[pageIdx].id,
            })),
          ),
        });

        // duplicate linkStyles
        await tx.linkStyle.createMany({
          data: site.pages.flatMap((page, pageIdx) =>
            page.linkStyles.map((linkStyle) => ({
              ...omit(linkStyle, ['id']),
              pageId: newPages[pageIdx].id,
            })),
          ),
        });
      });

      // set the version to live
      return prisma.site.update({
        where: { id: input.siteId },
        data: {
          liveVersionId: version.id,
        },
        include: {
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    }),
});

export default siteRouter;
