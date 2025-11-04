import type { Entity } from '@lastolivegames/becsy';
import { co } from '@lastolivegames/becsy';
import type { Tile } from '@prisma/client';
import * as PIXI from 'pixi.js';
import { v4 as uuid } from 'uuid';

import * as comps from '../components/index.js';
import { TILE_HEIGHT, TILE_WIDTH } from '../constants.js';
import { PointerAction } from '../types.js';
import Base from './Base.js';
import { createTile, deleteEntity, waitForPromise } from './common.js';
import EditHandler from './EditHandler.js';
import SelectionHandler from './SelectionHandler.js';

class SketchHandler extends Base {
  private readonly input = this.singleton.read(comps.Input);

  private readonly brush = this.singleton.read(comps.Brush);

  private readonly strokes = this.query((q) => q.current.with(comps.Stroke).write);

  private readonly tiles = this.query((q) => q.current.and.removed.with(comps.Tile).write);

  private readonly tileSources = this.query(
    (q) => q.addedOrChanged.with(comps.TileSource).write.trackWrites,
  );

  private readonly pages = this.query(
    (q) => q.current.and.addedOrChanged.with(comps.Page).trackWrites,
  );

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(EditHandler, SelectionHandler));
  }

  @co private *snapshotTiles(tileEntities: Entity[]): Generator {
    if (this.resources.app === undefined) {
      console.warn('App not found');
      return;
    }
    if (tileEntities.length === 0) return;

    co.scope(tileEntities[0]);
    co.cancelIfCoroutineStarted();
    co.waitForSeconds(0.15);

    this.resources.app.stop();

    const tileSprites = tileEntities.map((tileEntity) => this.getTileSprite(tileEntity));
    for (const tileSprite of tileSprites) {
      if (!tileSprite) continue;

      const pixels = this.resources.app.renderer.extract.pixels(tileSprite.texture);

      for (let i = 0; i < pixels.pixels.length; i += 4) {
        const a = pixels.pixels[i + 3] / 255;
        if (a === 0) continue;
        pixels.pixels[i] /= a;
        pixels.pixels[i + 1] /= a;
        pixels.pixels[i + 2] /= a;
      }

      const target = document.createElement('canvas');
      target.width = tileSprite.width;
      target.height = tileSprite.height;
      const ctx = target.getContext('2d');
      if (!ctx) continue;

      const imageData = ctx.createImageData(tileSprite.width, tileSprite.height);
      imageData.data.set(pixels.pixels);
      ctx.putImageData(imageData, 0, 0);

      const url = target.toDataURL('image/png');

      const res = (yield* waitForPromise(fetch(url))) as Response;
      const img = (yield* waitForPromise(res.blob())) as Blob;
      const blob = new Blob([img], { type: 'image/png' });
      const blobUrl = URL.createObjectURL(blob);

      const tileEntity = this.getTileEntity(tileSprite);
      if (!tileEntity) continue;

      const source = tileEntity.read(comps.Tile).source?.write(comps.TileSource);
      if (!source) continue;

      source.image = blobUrl;

      tileSprite.texture.source.label = blobUrl;
    }

    this.resources.app.start();

    this.createSnapshot();
  }

  @co private *applyImageToTile(tileEntity: Entity, sourceEntity: Entity): Generator {
    if (this.resources.app === undefined) {
      console.warn('App not found');
      return;
    }
    const tileSprite = this.getTileSprite(tileEntity);

    if (!tileSprite) return;

    const image = sourceEntity.read(comps.TileSource).image;
    if (tileSprite.texture.source.label === image) return;

    const heldTileEntity = tileEntity.hold();
    heldTileEntity.write(comps.Tile).loading = true;

    const sprite = new PIXI.Sprite();
    if (image !== '') {
      const texture = (yield* waitForPromise(
        PIXI.Assets.load({
          src: image,
          loadParser: 'loadTextures',
        }).catch(() => {
          // supressing 404 errors
        }),
      )) as PIXI.Texture | undefined;

      if (texture instanceof PIXI.Texture) {
        sprite.texture = texture;
      }
    }

    if (sprite.texture.label === 'EMPTY') {
      sprite.texture = PIXI.Texture.WHITE;
      sprite.alpha = 0;
      sprite.width = TILE_WIDTH;
      sprite.height = TILE_HEIGHT;
    }

    this.resources.app.renderer.render({
      container: sprite,
      target: tileSprite.texture,
      clear: true,
    });

    tileSprite.texture.source.label = image;

    heldTileEntity.write(comps.Tile).loading = false;
  }

  public execute(): void {
    for (const pageEntity of this.pages.addedOrChanged) {
      const page = pageEntity.read(comps.Page);

      this.resources.tileContainer?.scale.set(page.minWidth / 500);
    }

    if (this.input.pointerDownTrigger && this.input.pointerAction === PointerAction.Draw) {
      const brush = this.resources.brushInstances?.get(this.brush.kind);

      if (brush) {
        this.createEntity(comps.Stroke, {
          prevPoint: this.getPointerSketchPosition(),
        });
      }
    }

    // render strokes
    for (const strokeEntity of this.strokes.current) {
      const brush = this.resources.brushInstances?.get(this.brush.kind);
      if (!brush) continue;

      const stroke = strokeEntity.write(comps.Stroke);

      const start = [stroke.prevPoint[0], stroke.prevPoint[1]] as [number, number];
      const pointer = this.getPointerSketchPosition();
      const end = [Math.round(pointer[0]), Math.round(pointer[1])] as [number, number];
      stroke.prevPoint = pointer;

      const tileEntities = this.getIntersectedTiles(start, end, (1.4 * this.brush.size) / 2);

      const segmentLength = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);

      const segments = [];

      for (const tileEntity of tileEntities) {
        const tile = tileEntity.write(comps.Tile);
        tile.strokeEntity = strokeEntity;

        const tileSprite = this.getTileSprite(tileEntity);
        if (!tileSprite) {
          console.error('Tile sprite not found');
          continue;
        }

        const segment = {
          tileX: tileSprite.position.x,
          tileY: tileSprite.position.y,
          startX: start[0],
          startY: start[1],
          endX: end[0],
          endY: end[1],
          red: this.brush.red,
          green: this.brush.green,
          blue: this.brush.blue,
          alpha: this.brush.alpha,
          size: this.brush.size,
          kind: this.brush.kind,
          runningLength: stroke.runningLength,
        };

        brush.draw(segment, tileSprite.texture);
        segments.push(segment);
      }

      stroke.runningLength += segmentLength;
    }

    // delete strokes on pointer up
    if (this.input.pointerUpTrigger) {
      const brush = this.resources.brushInstances?.get(this.brush.kind);
      if (brush) {
        for (const strokeEntity of this.strokes.current) {
          const stroke = strokeEntity.read(comps.Stroke);
          this.snapshotTiles(stroke.tiles);
          deleteEntity(strokeEntity);
        }
      }
    }

    // update tile sprite images
    for (const tileSourceEntity of this.tileSources.addedOrChanged) {
      if (tileSourceEntity.has(comps.ToBeDeleted)) continue;
      const source = tileSourceEntity.read(comps.TileSource);
      const tileEntity = source.tiles[0];

      this.applyImageToTile(tileEntity, tileSourceEntity);
    }

    // remove tile sprites
    if (this.tiles.removed.length) {
      this.accessRecentlyDeletedData(true);
    }
    for (const tileEntity of this.tiles.removed) {
      const sprite = this.getTileSprite(tileEntity);
      if (!sprite) continue;

      this.resources.tileContainer?.removeChild(sprite);
      sprite.destroy(true);
    }
  }

  private getPointerSketchPosition(): [number, number] {
    const { tileContainer } = this.resources;
    if (!tileContainer) {
      console.warn('Tile container not found');
      return [0, 0];
    }
    return [
      this.input.pointer[0] / tileContainer.scale.x,
      this.input.pointer[1] / tileContainer.scale.y,
    ];
  }

  private getIntersectedTiles(
    start: [number, number],
    end: [number, number],
    tolerance: number,
  ): Entity[] {
    if (!this.resources.app || !this.resources.tileContainer) {
      console.warn('App or tile container not found');
      return [];
    }
    const tileContainer = this.resources.tileContainer;

    const intersected: Entity[] = [];
    const coords = new Set<string>();

    for (const point of [start, end]) {
      const x = point[0];
      const y = point[1];

      const left = Math.floor((x - tolerance) / (TILE_WIDTH * tileContainer.scale.x));
      const right = Math.floor((x + tolerance) / (TILE_WIDTH * tileContainer.scale.x));
      const top = Math.floor((y - tolerance) / (TILE_HEIGHT * tileContainer.scale.y));
      const bottom = Math.floor((y + tolerance) / (TILE_HEIGHT * tileContainer.scale.y));

      for (let i = left; i <= right; i++) {
        for (let j = top; j <= bottom; j++) {
          coords.add(`${i},${j}`);
        }
      }
    }

    for (const coord of coords) {
      const [xi, yi] = coord.split(',').map(Number);
      let tileEntity = this.tiles.current.find((tileEntity2: Entity) => {
        const tile = tileEntity2.read(comps.Tile);
        return tile.xi === xi && tile.yi === yi;
      });

      if (!tileEntity) {
        tileEntity = createTile(this, this.resources.app, tileContainer, {
          id: uuid(),
          xi,
          yi,
          url: '',
          pageId: this.pages.current[0].read(comps.Page).id,
        } as Tile);
      }

      intersected.push(tileEntity);
    }

    return intersected;
  }

  // private createTileSprite(tileEntity: Entity): void {
  //   const tile = tileEntity.read(comps.Tile);
  //   const source = tile.source?.read(comps.TileSource);
  //   if (!source) {
  //     throw new Error('Tile source not found');
  //   }

  //   const texture = PIXI.RenderTexture.create({
  //     width: TILE_WIDTH,
  //     height: TILE_HEIGHT,
  //   });
  //   const tileSprite = new PIXI.Sprite(texture);
  //   tileSprite.label = source.label;
  //   tileSprite.position.set(tile.position[0], tile.position[1]);

  //   const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  //   // sprite.tint = Math.random() * 0xffffff;
  //   sprite.alpha = 0;
  //   sprite.width = TILE_WIDTH;
  //   sprite.height = TILE_HEIGHT;

  //   this.app.renderer.render({
  //     container: sprite,
  //     target: tileSprite.texture,
  //     clear: true,
  //   });

  //   this.tileContainer.addChild(tileSprite);
  // }

  private getTileSprite(tileEntity: Entity): PIXI.Sprite | null {
    const source = tileEntity.read(comps.Tile).source?.read(comps.TileSource);
    if (!source) return null;

    const { label } = source;
    const sprite = this.resources.tileContainer?.children.find((child) => child.label === label);
    if (sprite instanceof PIXI.Sprite) return sprite;
    return null;
  }

  private getTileEntity(tileSprite: PIXI.Sprite): Entity | null {
    for (const tileEntity of this.tiles.current) {
      const source = tileEntity.read(comps.Tile).source?.read(comps.TileSource);
      if (!source) continue;
      const { label } = source;
      if (tileSprite.label === label) {
        return tileEntity;
      }
    }

    return null;
  }
}

export default SketchHandler;
