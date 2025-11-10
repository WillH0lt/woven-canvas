import { Auth, getAuth } from "firebase-admin/auth";

import { protectedProcedure, router } from "../trpc";
import { firebaseApp } from "../../utils/firebase";

const userRouter = router({
  fetch: protectedProcedure.query(async ({ ctx }) => {
    console.log("========= SERVER FETCHING USER");

    const { prisma, uid } = ctx;

    const userQuery = {
      where: {
        uid,
      },
      include: {
        userPages: {
          orderBy: { rank: "asc" as const },
        },
        pages: true,
      },
    };

    const user = await prisma.user.findFirst(userQuery);

    if (user) {
      return user;
    }

    // user profile hasn't been created yet
    // create it with data from firebase auth
    const auth = getAuth(firebaseApp);
    const firebaseUser = await auth.getUser(uid);

    return prisma.user.create({
      data: {
        uid,
        name: firebaseUser.displayName,
        avatarUrl: firebaseUser.photoURL,
      },
      // not that there's going to be anything returned here yet, but this makes the return value consistent
      include: userQuery.include,
    });
  }),
  acceptTerms: protectedProcedure.mutation(async ({ ctx }) => {
    const { prisma, uid } = ctx;

    return prisma.user.update({
      where: { uid },
      data: { acceptedTerms: true },
    });
  }),
  // updateName: protectedProcedure
  //   .input(PageNameUpdateSchema)
  //   .mutation(async ({ input, ctx }) => {
  //     const { prisma, uid } = ctx;

  //     const page = await prisma.page.findFirst({
  //       where: {
  //         id: input.pageId,
  //         OR: [{ uid }, { shareMode: "ReadWrite" }],
  //       },
  //     });

  //     if (!page) {
  //       throw new Error("Page not found or insufficient permissions");
  //     }

  //     return prisma.page.update({
  //       where: { id: input.pageId },
  //       data: {
  //         ...input.updates,
  //       },
  //     });
  //   }),
  // delete: protectedProcedure
  //   .input(
  //     z.object({
  //       pageId: z.string(),
  //     })
  //   )
  //   .mutation(async ({ input, ctx }) => {
  //     const { prisma, uid } = ctx;

  //     const page = await prisma.page.findFirst({
  //       where: { id: input.pageId, uid },
  //     });

  //     if (!page) {
  //       throw new Error("Page not found");
  //     }

  //     return prisma.page.delete({
  //       where: { id: input.pageId, uid },
  //     });
  //   }),
});

export default userRouter;
