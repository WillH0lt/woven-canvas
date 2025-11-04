import type { PrismaClient } from '@prisma/client';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { H3Event } from 'h3';

import { firebaseApp } from '~/server/utils/firebase.js';
import prisma from './db.js';

export interface Context {
  prisma: PrismaClient;
  uid: string | null;
  session: string | null;
}

export async function createContext(event: H3Event): Promise<Context> {
  const cookies = parseCookies(event);

  let uid: string | null = null;
  if (cookies.__session) {
    const auth = getAuth(firebaseApp);

    let claims: DecodedIdToken | null = null;
    claims = await auth.verifySessionCookie(cookies.__session, true);
    uid = claims.uid;
  }

  return {
    prisma,
    uid,
    session: cookies.__session,
  };
}
