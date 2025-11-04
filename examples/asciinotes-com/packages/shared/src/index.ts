import { PartTag } from '@prisma/client';

const SceneryTags = {
  BufferZone: 'BufferZone',
  Invisible: 'Invisible',
  TransformBox: 'TransformBox',
  TransformHandle: 'TransformHandle',
  Rail: 'Rail',
  Select: 'Select',
  SnapLine: 'SnapLine',
} as const;

export const Tag = {
  ...PartTag,
  ...SceneryTags,
};
