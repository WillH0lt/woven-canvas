import type { Entity } from '@lastolivegames/becsy';
import { component, field, Type } from '@lastolivegames/becsy';
import { ButtonKind, ShapeFillKind, ShapeKind, ShapeStrokeKind } from '@prisma/client';

import { LayerKind, Tag } from '../types.js';
import Effect from './Effect.js';
import Ghost from './Ghost.js';

@component
class Part {
  @field.staticString(Object.keys(Tag)) declare public tag: keyof typeof Tag;

  @field.dynamicString(36) declare public id: string;

  @field.float64 declare public left: number;

  @field.float64 declare public top: number;

  @field.float64 declare public width: number;

  @field.float64 declare public height: number;

  @field.float64 declare public rotateZ: number;

  @field({ type: Type.float64, default: 1 }) declare public opacity: number;

  @field.dynamicString(1e4) declare public innerHtml: string;

  @field.boolean declare public stretched: boolean;

  @field({ type: Type.boolean, default: true }) declare public aspectLocked: boolean;

  @field({ type: Type.float64, default: 24 }) declare public fontSize: number;

  @field({ type: Type.dynamicString(9), default: '#00000000' })
  declare public backgroundColor: string;

  @field({ type: Type.dynamicString(128), default: 'Figtree' }) declare public fontFamily: string;

  @field.dynamicString(512) declare public src: string;

  @field({ type: Type.float64, default: 1 }) declare public srcWidth: number;

  @field({ type: Type.float64, default: 1 }) declare public srcHeight: number;

  @field.dynamicString(36) declare public rank: string;

  @field.dynamicString(512) declare public href: string;

  // ununsed fields
  @field.dynamicString(36) declare public pageId: string;

  @field.dynamicString(128) declare public createdBy: string;

  @field.dynamicString(128) declare public createdAt: string;

  @field.dynamicString(128) declare public updatedAt: string;

  @field.dynamicString(36) declare public groupId: string;

  @field({ type: Type.staticString(Object.keys(ButtonKind)), default: ButtonKind.Standard })
  declare public buttonKind: keyof typeof ButtonKind;

  @field({ type: Type.staticString(Object.keys(ShapeKind)), default: ShapeKind.Rectangle })
  declare public shapeKind: keyof typeof ShapeKind;

  @field({ type: Type.staticString(Object.keys(ShapeStrokeKind)), default: ShapeStrokeKind.Solid })
  declare public shapeStrokeKind: keyof typeof ShapeStrokeKind;

  @field({ type: Type.float64, default: 4 }) declare public shapeStrokeWidth: number;

  @field.dynamicString(9) declare public shapeStrokeColor: string;

  @field({ type: Type.staticString(Object.keys(ShapeFillKind)), default: ShapeFillKind.Solid })
  declare public shapeFillKind: keyof typeof ShapeFillKind;

  @field.dynamicString(9) declare public shapeFillColor: string;

  @field({ type: Type.float64, default: 2 }) declare public shapeRoughness: number;

  @field({ type: Type.float64, default: 2 }) declare public shapeFillWidth: number;

  @field({ type: Type.float64, default: 10 }) declare public shapeHatchureGap: number;

  @field({ type: Type.float64, default: 135 }) declare public shapeHatchureAngle: number;

  // extra fields
  @field.staticString(Object.values(LayerKind)) declare public layer: LayerKind;

  @field.backrefs(Effect, 'part', true) declare public effects: Entity[];

  @field.backrefs(Ghost, 'part', true) declare public ghosts: Entity[];

  @field.ref declare public group: Entity | null;
}

export default Part;
