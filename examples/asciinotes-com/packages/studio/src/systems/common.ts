import type { ComponentType, Entity, System } from '@lastolivegames/becsy';
import type { Effect, Group, Page, Part, Tile } from '@prisma/client';
import { ScrollDirection } from '@prisma/client';
import { LexoRank } from 'lexorank';
import isEqual from 'lodash.isequal';
import * as PIXI from 'pixi.js';
import { v4 as uuid } from 'uuid';

import * as comps from '../components/index.js';
import {
  BUFFER_ZONE_RANK,
  RAIL_RANK,
  ROTATE_HANDLE_RANK,
  SELECTION_BOX_RANK,
  SNAP_LINE_RANK,
  TILE_HEIGHT,
  TILE_WIDTH,
  TRANSFORM_BOX_RANK,
  TRANSFORM_HANDLE_CORNER_RANK,
  TRANSFORM_HANDLE_EDGE_RANK,
} from '../constants.js';
import type { AABB, Extents, Layer, StateDelta, StateSnapshot } from '../types.js';
import {
  BufferZoneKind,
  CursorKind,
  LayerKind,
  RailKind,
  SnapLineKind,
  Tag,
  TransformHandleKind,
} from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* waitForPromise(promise: Promise<any>): Generator {
  let completed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/init-declarations
  let result: any;
  promise
    .then((res) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result = res;
    })
    .catch((err: unknown) => {
      console.error(err);
    })
    .finally(() => {
      completed = true;
    });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (!completed) {
    yield;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result;
}

export function deleteEntity(entity: Entity): void {
  if (!entity.has(comps.ToBeDeleted)) {
    entity.add(comps.ToBeDeleted);
  }
}

export function getCenter(partEntity: Entity): [number, number] {
  const part = partEntity.read(comps.Part);
  return [part.left + part.width / 2, part.top + part.height / 2];
}

interface Polygon {
  vertices: [number, number][];
}

function polygonsIntersect(a: Polygon, b: Polygon): boolean {
  // Uses the Separating Axis Theorem

  const polygons = [a, b];

  for (let i = 0; i < polygons.length; i++) {
    // for each polygon, look at each edge of the polygon, and determine if it separates
    // the two shapes
    const polygon = polygons[i];
    for (let i1 = 0; i1 < polygon.vertices.length; i1++) {
      // grab 2 vertices to create an edge
      const i2 = (i1 + 1) % polygon.vertices.length;
      const p1 = polygon.vertices[i1];
      const p2 = polygon.vertices[i2];

      // find the line perpendicular to this edge
      const normal = { x: p2[1] - p1[1], y: p1[0] - p2[0] };

      let minA: number | null = null;
      let maxA: number | null = null;
      // for each vertex in the first shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      let projected = 0;
      for (let j = 0; j < a.vertices.length; j++) {
        projected = normal.x * a.vertices[j][0] + normal.y * a.vertices[j][1];
        if (minA === null || projected < minA) {
          minA = projected;
        }
        if (maxA === null || projected > maxA) {
          maxA = projected;
        }
      }

      // for each vertex in the second shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      let minB: number | null = null;
      let maxB: number | null = null;
      for (let j = 0; j < b.vertices.length; j++) {
        projected = normal.x * b.vertices[j][0] + normal.y * b.vertices[j][1];
        if (minB === null || projected < minB) {
          minB = projected;
        }
        if (maxB === null || projected > maxB) {
          maxB = projected;
        }
      }

      // if there is no overlap between the projects, the edge we are looking at separates the two
      // polygons, and we know there is no overlap
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (maxA! < minB! || maxB! < minA!) {
        return false;
      }
    }
  }
  return true;
}

export function rotatePoint(
  point: [number, number],
  origin: [number, number],
  angle: number,
): [number, number] {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  return [
    origin[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
    origin[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
  ];
}

export function intersectRect(rect: AABB, partEntities: readonly Entity[]): Readonly<Entity>[] {
  const [st, sl, sw, sh] = rect;

  const p1: Polygon = {
    vertices: [
      [sl, st],
      [sl + sw, st],
      [sl + sw, st + sh],
      [sl, st + sh],
    ],
  };

  const intersectedParts: Readonly<Entity>[] = [];
  for (const partEntity of partEntities) {
    if (!partEntity.has(comps.Aabb)) continue;
    // const { top: t, left: l, width: w, height: h } = part;

    // check aabb
    const { value: aabb } = partEntity.read(comps.Aabb);
    if (!(st < aabb[3] && st + sh > aabb[1] && sl < aabb[2] && sl + sw > aabb[0])) continue;

    // check polygon intersection
    const part = partEntity.read(comps.Part);
    const center: [number, number] = [part.left + part.width / 2, part.top + part.height / 2];
    // const angle = part.rotateZ % Math.PI;
    const p2: Polygon = {
      vertices: [
        rotatePoint([part.left, part.top], center, part.rotateZ),
        rotatePoint([part.left + part.width, part.top], center, part.rotateZ),
        rotatePoint([part.left + part.width, part.top + part.height], center, part.rotateZ),
        rotatePoint([part.left, part.top + part.height], center, part.rotateZ),
      ],
    };

    if (!polygonsIntersect(p1, p2)) continue;

    intersectedParts.push(partEntity);
  }

  return intersectedParts;
}

export function getGroupedParts(partEntities: Readonly<Entity>[]): Readonly<Entity>[] {
  const ids = new Set<string>();
  const groupedParts: Readonly<Entity>[] = [];

  for (const partEntity of partEntities) {
    const { group, id } = partEntity.read(comps.Part);
    if (ids.has(id)) continue;

    ids.add(id);
    groupedParts.push(partEntity);

    if (!group) continue;

    for (const groupPartEntity of group.read(comps.Group).parts) {
      const groupPartId = groupPartEntity.read(comps.Part).id;
      if (ids.has(groupPartId)) continue;
      ids.add(groupPartId);
      groupedParts.push(groupPartEntity);
    }
  }

  return groupedParts;
}

export function intersectPoint(
  point: [number, number],
  partEntities: readonly Entity[],
): Entity | null {
  let intersection = null;
  let rank = LexoRank.min().toString();

  for (const partEntity of partEntities) {
    if (!partEntity.has(comps.Aabb)) continue;

    const { value: aabb } = partEntity.read(comps.Aabb);
    const { rank: partRank } = partEntity.read(comps.Part);

    const insideAabb =
      point[0] >= aabb[0] && point[0] <= aabb[2] && point[1] >= aabb[1] && point[1] <= aabb[3];

    if (!insideAabb) continue;

    const isHigherRank = LexoRank.parse(partRank).compareTo(LexoRank.parse(rank)) > 0;
    if (!isHigherRank) continue;

    const part = partEntity.read(comps.Part);
    if (part.rotateZ !== 0) {
      const center: [number, number] = [part.left + part.width / 2, part.top + part.height / 2];

      const r = rotatePoint(point, center, -part.rotateZ);
      const insideRect =
        r[0] >= part.left &&
        r[0] <= part.left + part.width &&
        r[1] >= part.top &&
        r[1] <= part.top + part.height;
      if (!insideRect) continue;
    }

    rank = partRank;
    intersection = partEntity;
  }
  return intersection;
}

export function getExtents(partEntities: readonly Entity[], angle: number): Extents {
  // rotate the coordinate system
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of partEntities) {
    if (angle === 0) {
      const { value: aabb } = entity.read(comps.Aabb);
      minX = Math.min(minX, aabb[0]);
      minY = Math.min(minY, aabb[1]);
      maxX = Math.max(maxX, aabb[2]);
      maxY = Math.max(maxY, aabb[3]);
    } else {
      const part = entity.read(comps.Part);
      const center: [number, number] = [part.left + part.width / 2, part.top + part.height / 2];
      const p1 = rotatePoint([part.left, part.top], center, part.rotateZ);
      const p2 = rotatePoint([part.left + part.width, part.top], center, part.rotateZ);
      const p3 = rotatePoint(
        [part.left + part.width, part.top + part.height],
        center,
        part.rotateZ,
      );
      const p4 = rotatePoint([part.left, part.top + part.height], center, part.rotateZ);

      const r1 = rotatePoint(p1, [0, 0], -angle);
      const r2 = rotatePoint(p2, [0, 0], -angle);
      const r3 = rotatePoint(p3, [0, 0], -angle);
      const r4 = rotatePoint(p4, [0, 0], -angle);

      minX = Math.min(minX, r1[0], r2[0], r3[0], r4[0]);
      minY = Math.min(minY, r1[1], r2[1], r3[1], r4[1]);
      maxX = Math.max(maxX, r1[0], r2[0], r3[0], r4[0]);
      maxY = Math.max(maxY, r1[1], r2[1], r3[1], r4[1]);
    }
  }

  const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const width = maxX - minX;
  const height = maxY - minY;

  const newCenter = rotatePoint(center, [0, 0], angle);
  const left = newCenter[0] - width / 2;
  const top = newCenter[1] - height / 2;

  return { left, top, width, height };
}

// export function applyTransform(tx: comps.Transform, vec: [number, number]): [number, number] {
//   const x = vec[0] * tx.a + vec[1] * tx.b + tx.tx;
//   const y = vec[0] * tx.c + vec[1] * tx.d + tx.ty;
//   return [x, y];
// }
// export function createTransform(rotation: number, scale: [number, number], translation: [number, number]): ] {
//   const matrix = new PIXI.Matrix();
//   matrix.set(rotation, scale[0], scale[1], rotation, translation[0], translation[1]);
//   return matrix;
// }

export function getAabb(partEntity: Entity): AABB {
  const part = partEntity.read(comps.Part);

  const halfWidth = part.width / 2;
  const halfHeight = part.height / 2;
  const center = [part.left + halfWidth, part.top + halfHeight];

  let angle = part.rotateZ % Math.PI;
  if (angle < 0) angle += Math.PI;
  if (angle > Math.PI / 2) angle = Math.PI - angle;

  const w = part.width * Math.cos(angle) + part.height * Math.sin(angle);
  const h = part.width * Math.sin(angle) + part.height * Math.cos(angle);

  return [center[0] - w / 2, center[1] - h / 2, center[0] + w / 2, center[1] + h / 2];
}

export function aabbsIntersect(a: AABB, b: AABB): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

export function getBoundingBox(partEntities: readonly Entity[]): AABB {
  if (partEntities.length === 0) {
    return [0, 0, 0, 0];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const entity of partEntities) {
    const aabb = getAabb(entity);
    minX = Math.min(minX, aabb[0]);
    minY = Math.min(minY, aabb[1]);
    maxX = Math.max(maxX, aabb[2]);
    maxY = Math.max(maxY, aabb[3]);
  }

  return [minX, minY, maxX, maxY];
}

export function readPart(partEntity: Entity): Part {
  const part = partEntity.read(comps.Part);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = {};
  for (const key in part) {
    if (key === 'effects' || key === 'ghosts' || key === 'group') continue;

    if (key === 'groupId') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      p[key] = part[key as keyof Part] === 'null' ? '' : part[key as keyof Part];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      p[key] = part[key as keyof Part];
    }
  }

  return p as Part;
}

export function readParts(partEntities: readonly Entity[]): Part[] {
  return partEntities.map((entity) => readPart(entity));
}

export function createGroup(system: System, group: Group): Entity {
  const groupEntity = system.createEntity(comps.Group, {
    ...group,
  });

  return groupEntity;
}

export function readGroup(groupEntity: Entity): Group {
  const group = groupEntity.read(comps.Group);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = {};
  for (const key in group) {
    if (key === 'effects' || key === 'parts') continue;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    g[key] = group[key as keyof Group];
  }

  return g as Group;
}

export function readGroups(groupEntities: readonly Entity[]): Group[] {
  return groupEntities.map((entity) => readGroup(entity));
}

export function createBlock(system: System, part: Part, groupEntity: Entity | null): Entity {
  const blockEntity = system.createEntity(
    comps.Block,
    comps.Transform,
    comps.Part,
    {
      ...part,
      groupId: part.groupId ?? '',
      group: groupEntity,
      layer: LayerKind.Block,
    },
    comps.Aabb,
    comps.Hoverable,
  );

  return blockEntity;
}

export function updateGhostPart(ghostEntity: Entity, partEntity: Entity): void {
  const part = readPart(partEntity);
  const ghost = ghostEntity.write(comps.Part);
  Object.assign(ghost, {
    ...part,
    groupId: '',
    id: ghost.id,
    opacity: part.opacity * 0.5,
    layer: LayerKind.Block,
    rank: LexoRank.parse(part.rank).genPrev().toString(),
  });
}

// export function addGhostPart(system: System, partEntity: Entity): void {
//   const ghosts = partEntity.read(comps.Part).ghosts;
//   if (ghosts.length > 0) return;

//   const part = readPart(partEntity);

//   system.createEntity(
//     comps.Ghost,
//     {
//       part: partEntity,
//     },
//     comps.Part,
//     {
//       ...part,
//       groupId: '',
//       opacity: part.opacity * 0.5,
//       id: uuid(),
//       layer: LayerKind.Block,
//       rank: LexoRank.parse(part.rank).genPrev().toString(),
//     },
//   );
// }

export function addGhostPart(system: System, partEntity: Entity): void {
  const ghosts = partEntity.read(comps.Part).ghosts;
  if (ghosts.length > 0) return;

  const ghostEntity = system.createEntity(
    comps.Ghost,
    {
      part: partEntity,
    },
    comps.Part,
    {
      id: uuid(),
    },
  );

  updateGhostPart(ghostEntity, partEntity);
}

export function createEffect(system: System, effect: Effect, partOrGroupEntity: Entity): Entity {
  const effectEntity = system.createEntity(comps.Effect, {
    ...effect,
    groupId: effect.groupId ?? '',
    partId: effect.partId ?? '',
    part: partOrGroupEntity.has(comps.Part) ? partOrGroupEntity : undefined,
    group: partOrGroupEntity.has(comps.Group) ? partOrGroupEntity : undefined,
  });

  return effectEntity;
}

export function updateEffect(effectEntity: Entity, effect: Effect): void {
  const effectComponent = effectEntity.write(comps.Effect);
  Object.assign(effectComponent, effect);
}

export function createTile(
  system: System,
  app: PIXI.Application,
  tileContainer: PIXI.Container,
  tile: Tile,
): Entity {
  const label = uuid();
  const sourceEntity = system.createEntity(comps.TileSource, {
    label,
    image: tile.url,
  });

  const position = [tile.xi * TILE_WIDTH, tile.yi * TILE_HEIGHT];
  const tileEntity = system.createEntity(comps.Tile, {
    ...tile,
    position,
    source: sourceEntity,
  });

  const texture = PIXI.RenderTexture.create({
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
  });
  const tileSprite = new PIXI.Sprite(texture);
  tileSprite.label = label;
  tileSprite.position.set(position[0], position[1]);

  const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  // sprite.tint = Math.random() * 0xffffff;
  sprite.alpha = 0;
  sprite.width = TILE_WIDTH;
  sprite.height = TILE_HEIGHT;

  app.renderer.render({
    container: sprite,
    target: tileSprite.texture,
    clear: true,
  });

  tileContainer.addChild(tileSprite);

  return tileEntity;
}

export function updateTile(tileEntity: Entity, tile: Tile): void {
  const sourceEntity = tileEntity.read(comps.Tile).source;
  if (sourceEntity) {
    const source = sourceEntity.write(comps.TileSource);
    source.image = tile.url;
  }
}

export function isTypeable(partEntity: Entity): boolean {
  const { tag } = partEntity.read(comps.Part);
  return tag === Tag.Text || tag === Tag.Note || tag === Tag.Button;
}

function isStretchableX(partEntity: Entity): boolean {
  const { tag } = partEntity.read(comps.Part);
  return tag === Tag.Text || tag === Tag.Button;
}

function isStretchableY(partEntity: Entity): boolean {
  const { tag } = partEntity.read(comps.Part);
  return tag === Tag.Tape;
}

export function updateBlock(blockEntity: Entity, part: Part, groupEntity: Entity | null): void {
  const partComponent = blockEntity.write(comps.Part);
  Object.assign(partComponent, part);

  partComponent.group = groupEntity;
}

export function readPage(pageEntity: Entity): Page {
  const page = pageEntity.read(comps.Page);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = {};
  // eslint-disable-next-line guard-for-in
  for (const key in page) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    p[key] = page[key as keyof Page];
  }

  return p as Page;
}

export function readEffect(effectEntity: Entity): Effect {
  const effect = effectEntity.read(comps.Effect);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = {};
  for (const key in effect) {
    if (key === 'part' || key === 'group') continue;

    if (key === 'groupId' || key === 'partId') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      e[key] = effect[key as keyof Effect] === 'null' ? '' : effect[key as keyof Effect];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      e[key] = effect[key as keyof Effect];
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    // e[key] = effect[key as keyof Effect];
  }

  return e as Effect;
}

export function readEffects(effectEntities: readonly Entity[]): Effect[] {
  return effectEntities.map((entity) => readEffect(entity));
}

export function readTile(tileEntity: Entity): Tile {
  const tile = tileEntity.read(comps.Tile);
  const source = tile.source?.read(comps.TileSource);

  const extraKeys = ['loading', 'source', 'strokeEntity', 'position'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = {};
  for (const key in tile) {
    if (extraKeys.includes(key)) continue;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    t[key] = tile[key as keyof Tile] as string | number | boolean;
  }

  return {
    ...t,
    url: source?.image ?? tile.url,
  } as Tile;
}

export function readTiles(tileEntities: readonly Entity[]): Tile[] {
  return tileEntities.map((entity) => readTile(entity));
}

export function addComponent(entity: Readonly<Entity>, component: ComponentType<unknown>): void {
  if (!entity.has(component)) entity.add(component);
}

export function removeComponent(entity: Readonly<Entity>, component: ComponentType<unknown>): void {
  if (entity.has(component)) entity.remove(component);
}

export function isGroupSelected(selectedParts: readonly Entity[]): boolean {
  if (selectedParts.length < 2) return false;

  const { groupId, group } = selectedParts[0].read(comps.Part);

  if (!groupId || !group) return false;

  const count = group.read(comps.Group).parts.length;

  if (selectedParts.length !== count) return false;

  return selectedParts.every((part) => part.read(comps.Part).groupId === groupId);
}

export function updateTransformBox(
  transformBoxEntity: Entity,
  selectedBlocks: readonly Entity[],
): void {
  if (selectedBlocks.length === 0) {
    throw new Error('No selected blocks');
  }

  let angle = selectedBlocks[0].read(comps.Part).rotateZ;
  const eps = 1e-6;
  for (let i = 1; i < selectedBlocks.length; i++) {
    if (Math.abs(selectedBlocks[i].read(comps.Part).rotateZ - angle) > eps) {
      angle = 0;
      break;
    }
  }

  const part = transformBoxEntity.write(comps.Part);
  const extents = getExtents(selectedBlocks, angle);

  part.left = extents.left;
  part.top = extents.top;
  part.width = extents.width;
  part.height = extents.height;
  part.rotateZ = angle;
  part.opacity = selectedBlocks[0].has(comps.Typed) ? 0 : 1;

  const transformBox = transformBoxEntity.write(comps.TransformBox);
  transformBox.startLeft = part.left;
  transformBox.startTop = part.top;
  transformBox.startWidth = part.width;
  transformBox.startHeight = part.height;

  for (const selectedEntity of selectedBlocks) {
    if (!selectedEntity.has(comps.Selected)) continue;

    const selected = selectedEntity.write(comps.Selected);
    const selectedPart = selectedEntity.read(comps.Part);
    selected.startLeft = selectedPart.left;
    selected.startTop = selectedPart.top;
    selected.startWidth = selectedPart.width;
    selected.startHeight = selectedPart.height;
    selected.startFontSize = selectedPart.fontSize;
  }
}

export function createTransformBox(
  system: System,
  selectedBlocks: readonly Entity[],
  pointerDown: boolean,
): Entity {
  const entity = system.createEntity(
    comps.TransformBox,
    {
      pointerHasBeenReleasedAtLeastOnce: !pointerDown,
    },
    comps.Part,
    {
      id: uuid(),
      tag: Tag.TransformBox,
      layer: LayerKind.Selection,
      opacity: pointerDown ? 1 : 0,
      // visible: !pointerDown,
      rank: TRANSFORM_BOX_RANK,
    },
    comps.Aabb,
    comps.Draggable,
    comps.Hoverable,
  );

  updateTransformBox(entity, selectedBlocks);

  return entity;
}

interface TransformHandleDef {
  tag: keyof typeof Tag;
  kind: TransformHandleKind | RailKind;
  left: number;
  top: number;
  width: number;
  height: number;
  rank: string;
  cursorKind: CursorKind;
}

export function updateTransformBoxHandles(
  transformBoxEntity: Entity,
  transformHandleEntities: readonly Entity[],
  selectedBlocks: readonly Entity[],
): void {
  const transformBoxPart = transformBoxEntity.read(comps.Part);
  const rotateZ = transformBoxPart.rotateZ;
  const left = transformBoxPart.left;
  const top = transformBoxPart.top;
  const width = transformBoxPart.width;
  const height = transformBoxPart.height;
  const handleSize = 15;
  const rotationHandleSize = 2 * handleSize;
  const sideHandleSize = 2 * handleSize;

  const handles: TransformHandleDef[] = [];

  const scaleKinds = [
    TransformHandleKind.TopLeftScale,
    TransformHandleKind.BottomLeftScale,
    TransformHandleKind.TopRightScale,
    TransformHandleKind.BottomRightScale,
  ];

  const rotateKinds = [
    TransformHandleKind.RotateTopLeft,
    TransformHandleKind.RotateTopRight,
    TransformHandleKind.RotateBottomLeft,
    TransformHandleKind.RotateBottomRight,
  ];

  const rotateCursorKinds = [CursorKind.NW, CursorKind.NE, CursorKind.SW, CursorKind.SE];

  // corners
  for (let xi = 0; xi < 2; xi++) {
    for (let yi = 0; yi < 2; yi++) {
      handles.push({
        tag: Tag.TransformHandle,
        kind: scaleKinds[xi + yi * 2],
        left: left + width * xi - handleSize / 2,
        top: top + height * yi - handleSize / 2,
        width: handleSize,
        height: handleSize,
        rank: TRANSFORM_HANDLE_CORNER_RANK,
        cursorKind: xi + yi === 1 ? CursorKind.NESW : CursorKind.NWSE,
      });

      handles.push({
        tag: Tag.Invisible,
        kind: rotateKinds[xi + yi * 2],
        left:
          left -
          rotationHandleSize +
          handleSize / 2 +
          xi * (width + rotationHandleSize - handleSize),
        top:
          top -
          rotationHandleSize +
          handleSize / 2 +
          yi * (height + rotationHandleSize - handleSize),
        width: rotationHandleSize,
        height: rotationHandleSize,
        rank: ROTATE_HANDLE_RANK,
        cursorKind: rotateCursorKinds[xi + yi * 2],
      });
    }
  }

  // top & bottom edges
  const stretchableY = selectedBlocks.length === 1 && isStretchableY(selectedBlocks[0]);
  for (let yi = 0; yi < 2; yi++) {
    let kind = TransformHandleKind.LeftScale;
    if (stretchableY) {
      kind = yi === 0 ? TransformHandleKind.TopStretch : TransformHandleKind.BottomStretch;
    } else {
      kind = yi === 0 ? TransformHandleKind.TopScale : TransformHandleKind.BottomScale;
    }

    handles.push({
      tag: Tag.Invisible,
      kind,
      left,
      top: top + height * yi - sideHandleSize / 2,
      width,
      height: sideHandleSize,
      rank: TRANSFORM_HANDLE_EDGE_RANK,
      cursorKind: CursorKind.NS,
    });
  }

  // left & right edges
  const stretchableX = selectedBlocks.length === 1 && isStretchableX(selectedBlocks[0]);
  for (let xi = 0; xi < 2; xi++) {
    let kind = TransformHandleKind.LeftScale;
    if (stretchableX) {
      kind = xi === 0 ? TransformHandleKind.LeftStretch : TransformHandleKind.RightStretch;
    } else {
      kind = xi === 0 ? TransformHandleKind.LeftScale : TransformHandleKind.RightScale;
    }

    handles.push({
      tag: Tag.Invisible,
      kind,
      left: left + width * xi - sideHandleSize / 2,
      top,
      width: sideHandleSize,
      height,
      rank: TRANSFORM_HANDLE_EDGE_RANK,
      cursorKind: CursorKind.EW,
    });
  }

  const center = getCenter(transformBoxEntity);

  for (const handleEntity of transformHandleEntities) {
    const { kind } = handleEntity.write(comps.TransformHandle);

    const handle = handles.find((h) => h.kind === kind);
    if (!handle) {
      console.warn('No handle found');
      continue;
      // throw new Error('No handle found');
    }

    const handleCenter: [number, number] = [
      handle.left + handle.width / 2,
      handle.top + handle.height / 2,
    ];
    const position = rotatePoint(handleCenter, center, rotateZ);

    const part = handleEntity.write(comps.Part);
    part.tag = handle.tag;
    part.left = position[0] - handle.width / 2;
    part.top = position[1] - handle.height / 2;
    part.width = handle.width;
    part.height = handle.height;
    part.rotateZ = rotateZ;
    part.rank = handle.rank;

    const hoverable = handleEntity.write(comps.Hoverable);
    hoverable.cursorKind = handle.cursorKind;
  }
}

export function createTransformHandles(
  system: System,
  transformBoxEntity: Entity,
  selectedBlocks: readonly Entity[],
): Entity[] {
  const kinds = [
    TransformHandleKind.TopLeftScale,
    TransformHandleKind.BottomRightScale,
    TransformHandleKind.TopRightScale,
    TransformHandleKind.BottomLeftScale,
    TransformHandleKind.RotateTopLeft,
    TransformHandleKind.RotateTopRight,
    TransformHandleKind.RotateBottomLeft,
    TransformHandleKind.RotateBottomRight,
  ];

  const stretchableX = selectedBlocks.length === 1 && isStretchableX(selectedBlocks[0]);
  if (stretchableX) {
    kinds.push(TransformHandleKind.LeftStretch, TransformHandleKind.RightStretch);
  } else {
    kinds.push(TransformHandleKind.LeftScale, TransformHandleKind.RightScale);
  }

  const stretchableY = selectedBlocks.length === 1 && isStretchableY(selectedBlocks[0]);
  if (stretchableY) {
    kinds.push(TransformHandleKind.TopStretch, TransformHandleKind.BottomStretch);
  } else {
    kinds.push(TransformHandleKind.TopScale, TransformHandleKind.BottomScale);
  }

  const transformHandleEntities = kinds.map((kind) =>
    system.createEntity(
      comps.TransformHandle,
      {
        kind,
        transformBox: transformBoxEntity,
      },
      comps.Part,
      {
        id: uuid(),
        // visible: false,
        opacity: 0,
        layer: LayerKind.Selection,
      },
      comps.Aabb,
      comps.Draggable,
      comps.Hoverable,
    ),
  );

  updateTransformBoxHandles(transformBoxEntity, transformHandleEntities, selectedBlocks);

  return transformHandleEntities;
}

export function setVisibility(entities: readonly Entity[], visible: boolean): void {
  for (const entity of entities) {
    const part = entity.write(comps.Part);
    part.opacity = visible ? 1 : 0;
  }
}

export function setActive(entities: readonly Entity[], active: boolean): void {
  for (const entity of entities) {
    if (active) {
      removeComponent(entity, comps.Inactive);
    } else {
      addComponent(entity, comps.Inactive);
    }
  }
}

export function setTransformBoxVisibility(transformBoxEntity: Entity, visible: boolean): void {
  const transformBox = transformBoxEntity.read(comps.TransformBox);

  if (visible) {
    const transformBoxPart = transformBoxEntity.read(comps.Part);
    const showAllHandles = transformBoxPart.width > 30 && transformBoxPart.height > 30;
    if (showAllHandles) {
      setVisibility(transformBox.handles, true);
      setActive(transformBox.handles, true);
    } else {
      const excludedKinds = [
        TransformHandleKind.TopRightScale,
        TransformHandleKind.BottomLeftScale,
        TransformHandleKind.RotateTopRight,
        TransformHandleKind.RotateBottomLeft,
      ];

      for (const handleEntity of transformBox.handles) {
        const handle = handleEntity.read(comps.TransformHandle);
        if (excludedKinds.includes(handle.kind)) {
          setVisibility([handleEntity], false);
          setActive([handleEntity], false);
        } else {
          setVisibility([handleEntity], true);
          setActive([handleEntity], true);
        }
      }
    }
  } else {
    setVisibility(transformBox.handles, false);
  }

  setVisibility([transformBoxEntity], visible);
}

export function createSelectionBox(system: System, position: [number, number]): Entity {
  return system.createEntity(
    comps.SelectionBox,
    {
      start: position,
    },
    comps.Part,
    {
      tag: Tag.Select,
      id: uuid(),
      layer: LayerKind.Selection,
      rank: SELECTION_BOX_RANK,
    },
  );
}

export function createLayers(system: System, layers: Layer[]): Entity[] {
  return layers.map((layer) => system.createEntity(comps.Layer, { ...layer }));
}

export function createSnapLine(
  system: System,
  kind: SnapLineKind,
  start: [number, number],
  end: [number, number],
  rotateZ: number,
): Entity {
  return system.createEntity(
    comps.SnapLine,
    {
      kind,
    },
    comps.Part,
    {
      tag: Tag.SnapLine,
      id: uuid(),
      left: Math.min(start[0], end[0]),
      top: Math.min(start[1], end[1]),
      width: Math.max(Math.abs(start[0] - end[0]), 1),
      height: Math.max(Math.abs(start[1] - end[1]), 1),
      rotateZ,
      layer: LayerKind.Selection,
      rank: SNAP_LINE_RANK,
    },
  );
}

export function updateSnapLine(
  snapLineEntity: Entity,
  start: [number, number],
  end: [number, number],
  rotateZ: number,
): void {
  const snapLinePart = snapLineEntity.write(comps.Part);
  snapLinePart.left = Math.min(start[0], end[0]);
  snapLinePart.top = Math.min(start[1], end[1]);
  snapLinePart.width = Math.max(Math.abs(start[0] - end[0]), 1);
  snapLinePart.height = Math.max(Math.abs(start[1] - end[1]), 1);
  snapLinePart.rotateZ = rotateZ;
}

export function updateRail(railEntity: Entity, page: comps.Page, length: number): void {
  const size = 1;

  const { kind } = railEntity.read(comps.Rail);
  const railPart = railEntity.write(comps.Part);

  const isMax = kind.toString().includes('max');
  let sign = 0;
  if (kind.toString().includes('positive')) {
    sign = 1;
  } else if (kind.toString().includes('negative')) {
    sign = -1;
  }

  let distFromCenter = 0;
  if (page.scrollDirection === ScrollDirection.Horizontal) {
    if (isMax) {
      distFromCenter = page.maxHeight;
    } else {
      distFromCenter = page.minHeight;
    }
  } else if (isMax) {
    distFromCenter = page.maxWidth;
  } else {
    distFromCenter = page.minWidth;
  }

  if (page.scrollDirection === ScrollDirection.Horizontal) {
    railPart.top = sign * (0.5 * distFromCenter - size / 2);
    railPart.left = 0;
    railPart.width = length;
    railPart.height = size;
  } else {
    railPart.left = sign * (0.5 * distFromCenter - size / 2);
    railPart.top = 0;
    railPart.width = size;
    railPart.height = length;
  }
}

export function createRail(system: System, kind: RailKind): Entity {
  const rail = system.createEntity(
    comps.Rail,
    {
      kind,
    },
    comps.Part,
    {
      tag: Tag.Rail,
      id: uuid(),
      layer: LayerKind.Selection,
      opacity: 0,
      rank: RAIL_RANK,
    },
  );
  // comps.Aabb,
  // comps.Hoverable,

  // const handle = system.createEntity(
  //   comps.RailHandle,
  //   {
  //     kind,
  //     rail,
  //   },
  //   comps.Part,
  //   {
  //     tag: Tag.Invisible,
  //     id: uuid(),
  //     layer: LayerKind.Selection,
  //   },
  //   comps.Rank,
  //   {
  //     value: RAIL_RANK,
  //   },
  //   comps.Aabb,
  //   comps.Draggable,
  //   comps.Hoverable,
  // );

  // updateRail(rail, page, 0);

  return rail;
}

export function updateBufferZone(
  bufferZoneEntity: Entity,
  worldSize: number,
  scrollDirection: ScrollDirection,
): void {
  const size = 1e6;

  const { kind } = bufferZoneEntity.read(comps.BufferZone);

  const part = bufferZoneEntity.write(comps.Part);

  if (scrollDirection === ScrollDirection.Horizontal) {
    part.top = -size / 2;
    part.height = size;
    part.width = size;
    part.left = kind === BufferZoneKind.Negative ? -size : worldSize;
  } else {
    part.height = size;
    part.width = size;
    part.left = -size / 2;
    part.top = kind === BufferZoneKind.Negative ? -size : worldSize;
  }
}

export function createBufferZone(
  system: System,
  kind: BufferZoneKind,
  scrollDirection: ScrollDirection,
): Entity {
  const bufferZone = system.createEntity(
    comps.BufferZone,
    {
      kind,
    },
    comps.Part,
    {
      tag: Tag.BufferZone,
      id: uuid(),
      layer: LayerKind.Selection,
      rank: BUFFER_ZONE_RANK,
    },
    comps.Hoverable,
    comps.Aabb,
  );

  updateBufferZone(bufferZone, 0, scrollDirection);

  return bufferZone;
}

export function getRankBounds(parts: readonly Entity[]): [LexoRank, LexoRank] {
  let minRank = LexoRank.max();
  let maxRank = LexoRank.min();

  for (const part of parts) {
    const rank = LexoRank.parse(part.read(comps.Part).rank);
    minRank = rank.compareTo(minRank) < 0 ? rank : minRank;
    maxRank = rank.compareTo(maxRank) > 0 ? rank : maxRank;
  }

  return [minRank, maxRank];
}

export function getNextRank(parts: readonly Entity[]): LexoRank {
  const rankBounds = getRankBounds(parts);
  const maxRank = rankBounds[1];
  const nextRank = maxRank.genNext();

  return nextRank;
}

export function toggleComponent(entity: Readonly<Entity>, component: ComponentType<unknown>): void {
  if (entity.has(component)) {
    entity.remove(component);
  } else {
    entity.add(component);
  }
}

export function getText(htmlString: string): string {
  let text = htmlString.replace(/<[^>]*>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  return text;
}

export function sortByRank(parts: Part[]): Part[] {
  return parts.sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)));
}

export function getOppositeRailKind(kind: RailKind): RailKind {
  switch (kind) {
    case RailKind.MinPositive:
      return RailKind.MinNegative;
    case RailKind.MaxPositive:
      return RailKind.MaxNegative;
    case RailKind.MinNegative:
      return RailKind.MinPositive;
    case RailKind.MaxNegative:
      return RailKind.MaxPositive;
    default:
      return kind;
  }
}

export function getOppositeTransformHandleKind(kind: TransformHandleKind): TransformHandleKind {
  switch (kind) {
    case TransformHandleKind.TopLeftScale:
      return TransformHandleKind.BottomRightScale;
    case TransformHandleKind.TopRightScale:
      return TransformHandleKind.BottomLeftScale;
    case TransformHandleKind.BottomLeftScale:
      return TransformHandleKind.TopRightScale;
    case TransformHandleKind.BottomRightScale:
      return TransformHandleKind.TopLeftScale;
    case TransformHandleKind.TopScale:
      return TransformHandleKind.BottomScale;
    case TransformHandleKind.RightScale:
      return TransformHandleKind.LeftScale;
    case TransformHandleKind.BottomScale:
      return TransformHandleKind.TopScale;
    case TransformHandleKind.LeftScale:
      return TransformHandleKind.RightScale;
    case TransformHandleKind.LeftStretch:
      return TransformHandleKind.RightStretch;
    case TransformHandleKind.RightStretch:
      return TransformHandleKind.LeftStretch;
    case TransformHandleKind.TopStretch:
      return TransformHandleKind.BottomStretch;
    case TransformHandleKind.BottomStretch:
      return TransformHandleKind.TopStretch;
    default:
      return kind;
  }
}

export function getTransformHandleVector(kind: TransformHandleKind): [number, number] {
  switch (kind) {
    case TransformHandleKind.TopLeftScale:
      return [-1, -1];
    case TransformHandleKind.TopRightScale:
      return [-1, 1];
    case TransformHandleKind.BottomLeftScale:
      return [1, -1];
    case TransformHandleKind.BottomRightScale:
      return [1, 1];
    case TransformHandleKind.TopScale:
      return [0, -1];
    case TransformHandleKind.RightScale:
      return [1, 0];
    case TransformHandleKind.BottomScale:
      return [0, 1];
    case TransformHandleKind.LeftScale:
      return [-1, 0];
    case TransformHandleKind.LeftStretch:
      return [-1, 0];
    case TransformHandleKind.RightStretch:
      return [1, 0];
    case TransformHandleKind.TopStretch:
      return [0, -1];
    case TransformHandleKind.BottomStretch:
      return [0, 1];
    default:
      return [0, 0];
  }
}

export function getTransformHandleSnapLines(kind: TransformHandleKind): SnapLineKind[] {
  const [y, x] = kind.toString().split('-');
  // const x = kind.toString().split('-')[1];

  const scaleSnapeLines = Object.values(SnapLineKind).filter((s) =>
    [y, x].includes(s.split('-')[0]),
  );

  return scaleSnapeLines;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function hexToRgba(hex: string): [number, number, number, number] {
  let bigint = parseInt(hex.slice(1), 16);

  if (hex.length === 7) {
    bigint = (bigint << 8) | 0xff;
  }

  return [(bigint >> 24) & 255, (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function hexToNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

export function rgbaToHex(red: number, green: number, blue: number, alpha: number): string {
  const r = Math.min(255, Math.max(0, Math.round(red)));
  const g = Math.min(255, Math.max(0, Math.round(green)));
  const b = Math.min(255, Math.max(0, Math.round(blue)));
  const a = Math.min(255, Math.max(0, Math.round(alpha)));

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  const aHex = a.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}${aHex}`;
}

// export function getTileImageUrl(baseUrl: string): string {
//   if (baseUrl === '') {
//     return '';
//   }
//   return `${baseUrl}/${uuid()}.png`;
// }

export function serializeParts(
  partEntities: readonly Entity[],
): Omit<StateSnapshot, 'page' | 'tiles'> {
  const state: Omit<StateSnapshot, 'page' | 'tiles'> = {
    parts: {},
    groups: {},
    effects: {},
  };

  const groups: Entity[] = [];
  const effects: Entity[] = [];

  for (const partEntity of partEntities) {
    const part = readPart(partEntity);
    state.parts[part.id] = part;

    const { effects: partEffects, group } = partEntity.read(comps.Part);
    if (group) {
      groups.push(group);
    }
    for (const effect of partEffects) {
      effects.push(effect);
    }
  }

  if (partEntities.length > 1) {
    for (const groupEntity of groups) {
      const group = readGroup(groupEntity);
      state.groups[group.id] = group;

      const { effects: groupEffects } = groupEntity.read(comps.Group);
      for (const effect of groupEffects) {
        effects.push(effect);
      }
    }
  }

  for (const effectEntity of effects) {
    const effect = readEffect(effectEntity);
    state.effects[effect.id] = effect;
  }

  return state;
}

export function deleteGroup(groupEntity: Entity): void {
  const group = groupEntity.read(comps.Group);
  for (const partEntity of group.parts) {
    if (partEntity.has(comps.ToBeDeleted)) continue;
    const part = partEntity.write(comps.Part);
    part.groupId = '';
  }

  for (const effectEntity of group.effects) {
    deleteEntity(effectEntity);
  }

  deleteEntity(groupEntity);
}

export function deleteUnusedGroups(groupEntities: readonly Entity[]): void {
  for (const groupEntity of groupEntities) {
    const group = groupEntity.read(comps.Group);

    let partCount = group.parts.length;
    for (const partEntity of group.parts) {
      if (partEntity.has(comps.ToBeDeleted)) partCount--;
    }

    if (partCount <= 1) {
      deleteGroup(groupEntity);
    }
  }
}

export function getPartEffects(partEntity: Entity): Entity[] {
  const effects = [];

  const part = partEntity.read(comps.Part);
  effects.push(...part.effects);

  if (part.group) {
    const group = part.group.read(comps.Group);
    effects.push(...group.effects);
  }

  return effects;
}

export function updateState(
  system: System,
  delta: StateDelta,

  currentGroups: readonly Entity[],
  currentParts: readonly Entity[],
  currentEffects: readonly Entity[],
  currentTiles: readonly Entity[],

  app: PIXI.Application | undefined,
  tileContainer: PIXI.Container | undefined,
): void {
  const groupEntities = new Map<string, Entity>();
  for (const group of currentGroups) {
    groupEntities.set(group.read(comps.Group).id, group);
  }

  const partEntities = new Map<string, Entity>();
  for (const part of currentParts) {
    partEntities.set(part.read(comps.Part).id, part);
  }

  const effectEntities = new Map<string, Entity>();
  for (const effect of currentEffects) {
    effectEntities.set(effect.read(comps.Effect).id, effect);
  }

  const tileEntities = new Map<string, Entity>();
  for (const tile of currentTiles) {
    tileEntities.set(tile.read(comps.Tile).id, tile);
  }

  // groups

  for (const group of delta.addedGroups) {
    const groupEntity = createGroup(system, group);
    groupEntities.set(group.id, groupEntity);
  }

  for (const group of delta.removedGroups) {
    const groupEntity = groupEntities.get(group.id);
    if (groupEntity) deleteEntity(groupEntity);
  }

  // parts

  for (const part of delta.addedParts) {
    const groupEntity = groupEntities.get(part.groupId ?? '') ?? null;
    const partEntity = createBlock(system, part, groupEntity);
    partEntities.set(part.id, partEntity);
  }

  for (const part of delta.removedParts) {
    const partEntity = partEntities.get(part.id);
    if (partEntity) deleteEntity(partEntity);
  }

  for (const part of delta.updatedParts) {
    const partEntity = partEntities.get(part.id);
    if (partEntity) {
      const group = groupEntities.get(part.groupId ?? '') ?? null;
      updateBlock(partEntity, part, group);
      removeComponent(partEntity, comps.Selected);
    }
  }

  // effects

  for (const effect of delta.addedEffects) {
    const partOrGroupEntity =
      effect.partId !== null && effect.partId !== ''
        ? partEntities.get(effect.partId)
        : groupEntities.get(effect.groupId ?? '');

    if (partOrGroupEntity) {
      createEffect(system, effect, partOrGroupEntity);
    } else {
      console.error('Owner entity not found for effect', effect);
    }
  }

  for (const effect of delta.removedEffects) {
    const effectEntity = effectEntities.get(effect.id);
    if (effectEntity) {
      deleteEntity(effectEntity);
    }
  }

  for (const effect of delta.updatedEffects) {
    const effectEntity = effectEntities.get(effect.id);
    if (effectEntity) updateEffect(effectEntity, effect);
  }

  // tiles
  if (app && tileContainer) {
    for (const tile of delta.addedTiles) {
      createTile(system, app, tileContainer, tile);
    }
  } else if (delta.addedTiles.length > 0) {
    console.error('Cannot create tiles, app or tile container is null');
  }

  for (const tile of delta.removedTiles) {
    const tileEntity = tileEntities.get(tile.id);
    if (tileEntity) {
      const sourceEntity = tileEntity.read(comps.Tile).source;
      if (sourceEntity) deleteEntity(sourceEntity);
      deleteEntity(tileEntity);
    }
  }

  for (const tile of delta.updatedTiles) {
    const tileEntity = tileEntities.get(tile.id);
    if (tileEntity) updateTile(tileEntity, tile);
  }
}

export function getAllEffectsForPart(partEntity: Entity): Entity[] {
  const effects = [];

  const part = partEntity.read(comps.Part);
  effects.push(...part.effects);

  if (part.group) {
    const group = part.group.read(comps.Group);
    effects.push(...group.effects);
  }

  return effects;
}

export function getAllPartsForEffect(effectEntity: Entity): Entity[] {
  const parts = [];

  const effect = effectEntity.read(comps.Effect);
  if (effect.part) {
    parts.push(effect.part);
  }

  if (effect.group) {
    const group = effect.group.read(comps.Group);
    parts.push(...group.parts);
  }

  return parts;
}

export function* duplicateParts(
  system: System,
  parts: Part[],
  groups: Group[],
  effects: Effect[],
  allBlocks: readonly Entity[],
  allGroups: readonly Entity[],
  shift: [number, number],
): Generator {
  // update ids
  for (const part of parts) {
    const oldId = part.id;
    part.id = uuid();

    for (const effect of effects) {
      if (effect.partId === oldId) {
        effect.partId = part.id;
      }
    }
  }

  // update group ids
  for (const group of groups) {
    const oldId = group.id;
    group.id = uuid();

    for (const part of parts) {
      if (part.groupId === oldId) {
        part.groupId = group.id;
      }
    }

    for (const effect of effects) {
      if (effect.groupId === oldId) {
        effect.groupId = group.id;
      }
    }
  }

  for (const effect of effects) {
    effect.id = uuid();
  }

  // map old ranks to new ranks
  const sortedParts = sortByRank(parts);
  const rankBounds = getRankBounds(allBlocks);
  let rank = rankBounds[1];

  for (const part of sortedParts) {
    rank = rank.genNext();
    part.rank = rank.toString();
  }

  // apply shift
  for (const part of sortedParts) {
    part.left += shift[0];
    part.top += shift[1];
  }

  // create the groups
  const groupEntities = groups.map((group) => createGroup(system, group));

  // create the parts and part effects
  for (const part of sortedParts) {
    const groupEntity =
      [...allGroups, ...groupEntities].find((i) => i.read(comps.Group).id === part.groupId) ?? null;
    const partEntity = createBlock(system, part, groupEntity);
    effects.filter((e) => e.partId === part.id).forEach((e) => createEffect(system, e, partEntity));
  }

  // create the group effects
  for (const groupEntity of groupEntities) {
    const group = groupEntity.read(comps.Group);
    effects
      .filter((e) => e.groupId === group.id)
      .forEach((e) => createEffect(system, e, groupEntity));
  }

  // wait a frame for the aabb to update
  yield;

  for (const part of sortedParts) {
    const partEntity = allBlocks.find((i) => i.read(comps.Part).id === part.id);
    if (partEntity) addComponent(partEntity, comps.Selected);
  }
}

// export function duplicateEffects(system: System, effects: Effect[], parts: readonly Entity[]): void {
//   for (const effect of effects) {
//     const partEntity = parts.find((i) => i.read(comps.Part).id === effect.partId);
//     if (!partEntity) continue;

//     createEffect(system, effect, partEntity);
//   }
// }

function getStateDeltaByKey<T>(
  oldState: StateSnapshot,
  newState: StateSnapshot,
  key: keyof Exclude<StateSnapshot, 'page'>,
): { added: T[]; removed: T[]; updated: T[] } {
  const added: T[] = [];
  const removed: T[] = [];
  const updated: T[] = [];

  for (const id of Object.keys(oldState[key])) {
    const oldItem = (oldState[key] as Record<string, T>)[id];

    if (id in newState[key]) {
      const newItem = (newState[key] as Record<string, T>)[id];
      if (!isEqual(oldItem, newItem)) {
        updated.push(newItem);
      }
    } else {
      removed.push(oldItem);
    }
  }

  for (const id of Object.keys(newState[key])) {
    if (!(id in oldState[key])) {
      added.push((newState[key] as Record<string, T>)[id]);
    }
  }

  return { added, removed, updated };
}

export function getStateDelta(oldState: StateSnapshot, newState: StateSnapshot): StateDelta {
  const {
    added: addedParts,
    removed: removedParts,
    updated: updatedParts,
  } = getStateDeltaByKey<Part>(oldState, newState, 'parts');

  const {
    added: addedEffects,
    removed: removedEffects,
    updated: updatedEffects,
  } = getStateDeltaByKey<Effect>(oldState, newState, 'effects');

  const {
    added: addedGroups,
    removed: removedGroups,
    updated: updatedGroups,
  } = getStateDeltaByKey<Group>(oldState, newState, 'groups');

  const {
    added: addedTiles,
    removed: removedTiles,
    updated: updatedTiles,
  } = getStateDeltaByKey<Tile>(oldState, newState, 'tiles');

  return {
    addedParts,
    removedParts,
    updatedParts,
    addedEffects,
    removedEffects,
    updatedEffects,
    addedGroups,
    updatedGroups,
    removedGroups,
    addedTiles,
    removedTiles,
    updatedTiles,
  };
}

export function smoothDamp(
  current: number,
  target: number,
  currentVelocity: number,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): { value: number; velocity: number } {
  if (Math.abs(current - target) < 0.0001) {
    return {
      value: target,
      velocity: 0,
    };
  }

  const omega = 2 / smoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTo = target;

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  change = Math.max(-maxChange, Math.min(change, maxChange));
  const deltaTarget = current - change;

  const temp = (currentVelocity + omega * change) * deltaTime;
  let velocity = (currentVelocity - omega * temp) * exp;
  let value = deltaTarget + (change + temp) * exp;

  // Prevent overshooting
  if (originalTo - current > 0 === value > originalTo) {
    value = originalTo;
    velocity = (value - originalTo) / deltaTime;
  }

  return {
    value,
    velocity,
  };
}

export function updateScrollView(
  viewEntity: Entity,
  deltaY: number,
  deltaT: number,
  scrollTrackLength: number,
): number {
  const view = viewEntity.write(comps.View);

  view.target += deltaY;
  view.target = clamp(view.target, 0, scrollTrackLength);

  if (Math.abs(view.target - view.current) < 1) {
    return view.current;
  }

  const damped = smoothDamp(
    view.current,
    view.target,
    view.velocity,
    view.smoothTime,
    view.maxSpeed,
    deltaT,
  );

  view.velocity = damped.velocity;
  view.previous = view.current;
  view.current = Math.max(damped.value, 0);

  return view.current;
}

export function getDefaultScale(page: comps.Page, width: number, height: number): number {
  let scale = 1;
  if (page.scrollDirection === ScrollDirection.Horizontal) {
    if (page.minHeight !== 0 && height < page.minHeight) {
      scale = height / page.minHeight;
    } else if (page.maxHeight !== 0 && height > page.maxHeight) {
      scale = height / page.maxHeight;
    }
  } else if (page.minWidth !== 0 && width < page.minWidth) {
    scale = width / page.minWidth;
  } else if (page.maxWidth !== 0 && width > page.maxWidth) {
    scale = width / page.maxWidth;
  }
  return scale;
}

export function getNormalizedDeltaY(event: WheelEvent): number {
  const PIXEL_MODE = 0;
  const LINE_MODE = 1;
  const PAGE_MODE = 2;

  // Default line height in pixels (approximate)
  const LINE_HEIGHT = 16;

  // Default page height in pixels (approximate)
  const PAGE_HEIGHT = window.innerHeight;

  let deltaY = event.deltaY;

  // Normalize based on the deltaMode
  switch (event.deltaMode) {
    case LINE_MODE:
      // Convert from lines to pixels
      deltaY *= LINE_HEIGHT;
      break;
    case PAGE_MODE:
      // Convert from pages to pixels
      deltaY *= PAGE_HEIGHT;
      break;
    case PIXEL_MODE:
    default:
      // Already in pixels, no conversion needed
      break;
  }

  // Account for Firefox (which often uses smaller values)
  if (navigator.userAgent.includes('Firefox')) {
    deltaY *= 4;
  }

  // You may want to add a multiplier for macOS where values can be smaller
  if (navigator.userAgent.includes('Mac') || navigator.userAgent.includes('Macintosh')) {
    deltaY *= 1.5;
  }

  deltaY = clamp(deltaY, -100, 100);

  return deltaY;
}
