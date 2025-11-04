import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

import Tile from './Tile.js';

@component
export class TileSource {
  @field.dynamicString(512) public declare image: string;

  @field.dynamicString(36) public declare label: string;

  @field.backrefs(Tile, 'source') public declare tiles: Entity[];
}

export default TileSource;
