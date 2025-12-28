import { getAuth } from "firebase-admin/auth";
import { LexoRank } from "@dalet-oss/lexorank";

import { protectedProcedure, router } from "../trpc";
import { firebaseApp } from "../../utils/firebase";

const userRouter = router({
  fetch: protectedProcedure.query(async ({ ctx }) => {
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
        pages: {
          create: [
            {
              name: "Untitled Page",
              icon: "📋",
              userPages: {
                create: [
                  {
                    rank: LexoRank.middle().toString(),
                    uid,
                  },
                ],
              },
            },
          ],
        },
      },
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
});

export default userRouter;
