import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

@component
class Tile {
  @field.dynamicString(36) declare public id: string;

  @field.dynamicString(36) declare public pageId: string;

  @field.int32 declare public xi: number;

  @field.int32 declare public yi: number;

  // extra fields
  @field.ref declare public source: Entity | null;

  @field.ref declare public strokeEntity: Entity | null;

  @field.int32.vector(2) declare public position: [number, number];

  // @field.int32.vector(2) public declare index: [number, number];

  @field.boolean declare public loading: boolean;

  // ununsed fields
  @field.dynamicString(512) declare public url: string;

  @field.dynamicString(128) declare public createdBy: string;

  @field.dynamicString(128) declare public createdAt: string;

  @field.dynamicString(128) declare public updatedAt: string;
}

export default Tile;
