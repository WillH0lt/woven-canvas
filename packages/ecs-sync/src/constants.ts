export const Origin = {
  ECS: 1,
  History: 2,
  Persistence: 3,
  Websocket: 4,
} as const;

export type Origin = (typeof Origin)[keyof typeof Origin];
