import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';
import { EffectDirection, EffectKind, TriggerReason } from '@prisma/client';

@component
class Effect {
  @field.ref declare public part: Entity | null;

  @field.ref declare public group: Entity | null;

  @field.dynamicString(36) declare public id: string;

  @field.dynamicString(36) declare public pageId: string;

  @field.dynamicString(36) declare public partId: string;

  @field.dynamicString(36) declare public groupId: string;

  @field.dynamicString(36) declare public name: string;

  @field.staticString(Object.values(EffectKind)) declare public kind: EffectKind;

  @field.staticString(Object.values(TriggerReason)) declare public startWhen: TriggerReason;

  @field.staticString(Object.values(EffectDirection)) declare public direction: EffectDirection;

  @field.float64 declare public deltaParallel: number;

  @field.float64 declare public deltaPerpendicular: number;

  @field.float64 declare public deltaRotateZ: number;

  @field.float64 declare public scalarOpacity: number;

  @field.float64 declare public scalarScale: number;

  @field.float64 declare public distancePx: number;

  @field.dynamicString(36) declare public rank: boolean;

  // ununsed fields
  @field.dynamicString(128) declare public createdBy: string;

  @field.dynamicString(128) declare public createdAt: string;

  @field.dynamicString(128) declare public updatedAt: string;

  // extra fields
  @field.float64 declare public percent: number;
}

export default Effect;
