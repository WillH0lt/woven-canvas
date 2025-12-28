import { z } from "zod";

import { LexoRank } from "@dalet-oss/lexorank";

function isValidLexoRank(value: string): boolean {
  try {
    LexoRank.parse(value);
    return true;
  } catch {
    return false;
  }
}

export const UserPageCreateSchema = z.object({
  rank: z.string().refine(isValidLexoRank, {
    message: "Invalid rank format.",
  }),
  isPinned: z.boolean().optional(),
});

export const UserPageUpdateSchema = z.object({
  pageId: z.string(),
  updates: UserPageCreateSchema.partial(),
});
