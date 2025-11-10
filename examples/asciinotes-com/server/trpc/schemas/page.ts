import { z } from "zod";

import { ShareMode } from "@prisma/client";

function isSingleEmoji(value: string): boolean {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const segments = Array.from(segmenter.segment(value));
  return segments.length === 1;
}

export const PageCreateSchema = z.object({
  name: z.string().max(255, { message: "Please use 255 or fewer characters." }),
  icon: z
    .emoji()
    .refine(isSingleEmoji, { message: "Must be exactly one emoji" }),
});

export const PageNameUpdateSchema = z.object({
  pageId: z.string(),
  updates: PageCreateSchema.partial(),
});

export const PageShareModeUpdateSchema = z.object({
  pageId: z.string(),
  updates: z.object({
    shareMode: z.enum(ShareMode),
  }),
});
