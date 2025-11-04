import {
  ButtonKind,
  EffectDirection,
  EffectKind,
  PartTag,
  ScrollDirection,
  ShapeFillKind,
  ShapeKind,
  ShapeStrokeKind,
  TextDecoration,
  TriggerReason,
} from '@prisma/client';
import { z } from 'zod';

export const SiteUpdateSchema = z.object({
  siteId: z.string(),
  updates: z.object({
    name: z.string().max(255, { message: 'Please use 255 or fewer characters.' }).optional(),
    slug: z
      .string()
      .min(3, { message: 'Please use at least 3 characters.' })
      .max(64, { message: 'Please use 64 or fewer characters.' })
      .toLowerCase()
      .trim()
      .regex(/^[a-z0-9-]+$/, {
        message: 'Please only use lowercase letters, numbers, and hyphens.',
      })
      .optional(),
    title: z.string().max(255, { message: 'Please use 255 or fewer characters.' }).optional(),
    description: z.string().max(255, { message: 'Please use 255 or fewer characters.' }).optional(),
    googleAnalyticsId: z
      .string()
      .max(24, { message: 'Please use 24 or fewer characters.' })
      .trim()
      .optional(),
    favicon: z.string().optional(),
    ogImage: z.string().optional(),
    domain: z
      .string()
      .min(3, { message: 'Please use at least 3 characters.' })
      .max(255, { message: 'Please use 255 or fewer characters.' })
      .toLowerCase()
      .trim()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/, {
        message: 'Please use a valid domain.',
      })
      .nullable()
      .optional(),
  }),
});

export const PageUpdateSchema = z.object({
  pageId: z.string(),
  updates: z.object({
    title: z.string().max(255, { message: 'Please use 255 or fewer characters.' }).optional(),
    description: z.string().max(255, { message: 'Please use 255 or fewer characters.' }).optional(),
    path: z
      .string()
      .regex(/^[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)*$/, {
        message: 'Please use a valid path.',
      })
      .max(255, { message: 'Please use 255 or fewer characters.' })
      .optional(),
    ogImage: z.string().optional(),
    scrollDirection: z.nativeEnum(ScrollDirection).optional(),
    backgroundColor: z.string().startsWith('#').length(7).optional(),
    minWidth: z.number().optional(),
    maxWidth: z.number().optional(),
    minHeight: z.number().optional(),
    maxHeight: z.number().optional(),
  }),
});

// export const PageInputSchema = z.object({
//   id: z.string(),
//   title: z.string(),
//   description: z.string(),
//   path: z.string(),
//   ogImage: z.string(),
//   scrollDirection: z.nativeEnum(ScrollDirection),
//   minWidth: z.number(),
//   maxWidth: z.number(),
//   minHeight: z.number(),
//   maxHeight: z.number(),
// });

export const GroupInputSchema = z.object({
  id: z.string(),
  pageId: z.string(),
});

export const PartInputSchema = z.object({
  id: z.string(),
  tag: z.nativeEnum(PartTag),
  left: z.number(),
  top: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  rotateZ: z.number(),
  opacity: z.number().min(0).max(1),
  rank: z.string(),
  innerHtml: z.string(),
  fontSize: z.number().min(1),
  backgroundColor: z.string(),
  stretched: z.boolean(),
  fontFamily: z.string(),
  pageId: z.string(),
  src: z.string(),
  srcWidth: z.number().min(1),
  srcHeight: z.number().min(1),
  aspectLocked: z.boolean(),

  href: z.string(),
  buttonKind: z.nativeEnum(ButtonKind),

  shapeKind: z.nativeEnum(ShapeKind),
  shapeStrokeKind: z.nativeEnum(ShapeStrokeKind),
  shapeStrokeWidth: z.number(),
  shapeStrokeColor: z.string(),
  shapeFillKind: z.nativeEnum(ShapeFillKind),
  shapeFillColor: z.string(),
  shapeRoughness: z.number(),
  shapeFillWidth: z.number(),
  shapeHatchureGap: z.number(),
  shapeHatchureAngle: z.number(),

  groupId: z
    .string()
    .transform((x) => x || null)
    .nullable(),
});

export const EffectInputSchema = z.object({
  id: z.string(),
  kind: z.nativeEnum(EffectKind),
  direction: z.nativeEnum(EffectDirection),
  startWhen: z.nativeEnum(TriggerReason),
  distancePx: z.number().min(0),
  deltaParallel: z.number(),
  deltaPerpendicular: z.number(),
  deltaRotateZ: z.number(),
  scalarOpacity: z.number().min(0).max(100),
  scalarScale: z.number().min(0),
  pageId: z.string(),
  partId: z
    .string()
    .transform((x) => x || null)
    .nullable(),
  groupId: z
    .string()
    .transform((x) => x || null)
    .nullable(),
  rank: z.string(),
});

export const TileInputSchema = z.object({
  id: z.string(),
  xi: z.number(),
  yi: z.number(),
  url: z.string(),
  pageId: z.string(),
});

export const LinkStyleInputSchema = z.object({
  name: z.string().optional(),
  pageId: z.string(),
  color: z.string(),
  decoration: z.nativeEnum(TextDecoration),
  hoverColor: z.string(),
  hoverDecoration: z.nativeEnum(TextDecoration),
  rank: z.string(),
});
