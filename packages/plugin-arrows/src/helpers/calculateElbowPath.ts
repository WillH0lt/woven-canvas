import type { RayIntersection } from "@infinitecanvas/math";
import { Aabb, Mat2, Ray, Rect, Scalar, Vec2 } from "@infinitecanvas/math";
import type { Context, EntityId } from "@infinitecanvas/editor";
import { Block } from "@infinitecanvas/editor";
import { MinHeap } from "./MinHeap";

interface Node {
  id: number;
  connections: number[];
  distances: { [key: number]: number };
  coords: Vec2;
}

type TurnDirection = "left" | "right";

/**
 * Calculate the path for an elbow arrow between two points,
 * optionally routing around connected blocks.
 *
 * @param rotation - Arrow rotation in radians. When non-zero, the algorithm
 * computes paths aligned to the arrow's rotation axis instead of world XY.
 */
export function calculateElbowPath(
  ctx: Context,
  start: Vec2,
  end: Vec2,
  startBlockId: EntityId | null,
  endBlockId: EntityId | null,
  padding: number,
  rotation: number,
): Vec2[] {
  const calculator = new ElbowPathCalculator(
    ctx,
    start,
    end,
    padding,
    rotation,
  );
  return calculator.calculate(startBlockId, endBlockId);
}

/**
 * Handles elbow path calculation with coordinate space transformations.
 */
class ElbowPathCalculator {
  private readonly ctx: Context;
  private readonly padding: number;
  private readonly rotation: number;
  private readonly toLocal: Mat2;
  private readonly toWorld: Mat2;
  private readonly localStart: Vec2;
  private readonly localEnd: Vec2;

  constructor(
    ctx: Context,
    start: Vec2,
    end: Vec2,
    padding: number,
    rotation: number,
  ) {
    this.ctx = ctx;
    this.padding = padding;
    this.rotation = rotation;

    // Create transform matrices for coordinate space conversion
    const pivot = Vec2.midPoint(start, end);

    // World to local: translate(-pivot), then rotate(-rotation)
    this.toLocal = Mat2.fromTranslation(-pivot[0], -pivot[1]);
    Mat2.rotate(this.toLocal, -rotation);

    // Local to world: rotate(rotation), then translate(pivot)
    this.toWorld = Mat2.fromRotation(rotation);
    Mat2.translate(this.toWorld, pivot[0], pivot[1]);

    // Transform start/end to local space
    this.localStart = this.transformToLocal(start);
    this.localEnd = this.transformToLocal(end);
  }

  private transformToLocal(point: Vec2): Vec2 {
    const result = Vec2.clone(point);
    Mat2.transformPoint(this.toLocal, result);
    return result;
  }

  private transformToWorld(point: Vec2): Vec2 {
    const result = Vec2.clone(point);
    Mat2.transformPoint(this.toWorld, result);
    return result;
  }

  calculate(
    startBlockId: EntityId | null,
    endBlockId: EntityId | null,
  ): Vec2[] {
    const startRay = this.calculateRay(
      this.localStart,
      this.localEnd,
      startBlockId,
    );
    const endRay = this.calculateRay(
      this.localEnd,
      this.localStart,
      endBlockId,
    );

    let path: Vec2[];

    if (startBlockId && endBlockId) {
      // If either point is inside the other block's margin,
      // the blocks overlap or are very close - use simple point-to-point routing
      const startInEndBlock = this.isPointInsideBlockMargin(
        this.localStart,
        endBlockId,
      );
      const endInStartBlock = this.isPointInsideBlockMargin(
        this.localEnd,
        startBlockId,
      );

      if (startInEndBlock || endInStartBlock) {
        path = routePointToPoint(Ray.origin(startRay), Ray.origin(endRay));
      } else {
        path = this.routeBlockToBlock(
          startBlockId,
          endBlockId,
          startRay,
          endRay,
        );
      }
    } else if (startBlockId && !endBlockId) {
      // If the endpoint is inside or within margin of the block, use point-to-point
      if (this.isPointInsideBlockMargin(this.localEnd, startBlockId)) {
        path = routePointToPoint(Ray.origin(startRay), this.localEnd);
      } else {
        path = this.routeBlockToPoint(startBlockId, startRay, this.localEnd);
      }
    } else if (!startBlockId && endBlockId) {
      // If the start point is inside or within margin of the block, use point-to-point
      if (this.isPointInsideBlockMargin(this.localStart, endBlockId)) {
        path = routePointToPoint(this.localStart, Ray.origin(endRay));
      } else {
        path = this.routeBlockToPoint(
          endBlockId,
          endRay,
          this.localStart,
        ).reverse();
      }
    } else {
      path = routePointToPoint(Ray.origin(startRay), this.localEnd);
    }

    // Transform path back to world space
    for (let i = 0; i < path.length; i++) {
      path[i] = this.transformToWorld(path[i]);
    }

    return path;
  }

  /**
   * Get block AABB in local (arrow-aligned) coordinate space.
   */
  private getBlockAabb(entityId: EntityId): Aabb {
    const block = Block.read(this.ctx, entityId);

    // Transform center to local space
    const center: Vec2 = [
      block.position[0] + block.size[0] / 2,
      block.position[1] + block.size[1] / 2,
    ];
    const localCenter = this.transformToLocal(center);

    // The relative rotation is block rotation minus arrow rotation
    const relativeRotation = (block.rotateZ || 0) - this.rotation;

    const localPosition: Vec2 = [
      localCenter[0] - block.size[0] / 2,
      localCenter[1] - block.size[1] / 2,
    ];

    const out: Aabb = [0, 0, 0, 0];
    Rect.getAabb(localPosition, block.size, relativeRotation, out);
    return out;
  }

  /**
   * Check if a point (in local space) is inside or within the padding margin of a block.
   */
  private isPointInsideBlockMargin(point: Vec2, blockId: EntityId): boolean {
    const aabb = this.getBlockAabb(blockId);
    Aabb.pad(aabb, this.padding);
    return Aabb.containsPoint(aabb, point);
  }

  private routeBlockToBlock(
    startBlockId: EntityId,
    endBlockId: EntityId,
    startRay: Ray,
    endRay: Ray,
  ): Vec2[] {
    const startAabb = this.getBlockAabb(startBlockId);
    const endAabb = this.getBlockAabb(endBlockId);

    Aabb.pad(startAabb, this.padding);
    Aabb.pad(endAabb, this.padding);

    extendAabbsToMeet(startAabb, endAabb);

    const nodes = getNodes(startAabb, endAabb);

    const startId = intersectRayAndAddNode(startRay, nodes);
    const endId = intersectRayAndAddNode(endRay, nodes);

    const startOrigin = Ray.origin(startRay);
    const endOrigin = Ray.origin(endRay);

    if (startId === null || endId === null) {
      console.warn(
        "[routeBlockToBlock] Failed to add start or end node to graph",
      );

      return [startOrigin, endOrigin];
    }

    const nodePath = shortestPathInGraph(nodes, startId, endId);

    if (nodePath === null) {
      return [startOrigin, endOrigin];
    }

    const path: Vec2[] = [startOrigin];
    for (const nodeId of nodePath) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        path.push(node.coords);
      }
    }
    path.push(endOrigin);

    removeDuplicates(path);
    removeStraightLinePoints(path);
    removeZigZagPoints(path);

    return path;
  }

  private routeBlockToPoint(
    blockId: EntityId,
    ray: Ray,
    endPoint: Vec2,
  ): Vec2[] {
    const rayOrigin = Ray.origin(ray);
    const rayDir = Ray.direction(ray);
    const dominantDirection = getDominantDirection(rayOrigin, endPoint);
    if (
      rayDir[0] === dominantDirection[0] &&
      rayDir[1] === dominantDirection[1]
    ) {
      return routePointToPoint(rayOrigin, endPoint);
    }

    const aabb = this.getBlockAabb(blockId);
    Aabb.pad(aabb, this.padding);

    const endRay = Ray.fromPoints(endPoint, [
      -dominantDirection[0],
      -dominantDirection[1],
    ]);

    const intersects = Ray.intersectAabb(endRay, aabb);
    if (intersects.length === 0) {
      Aabb.expand(aabb, endPoint);
    }

    const perimeter = Aabb.corners(aabb);
    const nodes = perimeterToNodes(perimeter);

    const endId = intersectRayAndAddNode(endRay, nodes);
    const startId = intersectRayAndAddNode(ray, nodes);

    if (startId === null || endId === null) {
      return [rayOrigin, endPoint];
    }

    const nodePath = shortestPathInGraph(nodes, startId, endId);
    if (nodePath === null) {
      return [rayOrigin, endPoint];
    }

    const path: Vec2[] = [rayOrigin];
    for (const nodeId of nodePath) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        path.push(node.coords);
      }
    }

    if (intersects.length > 0) {
      path.push(endPoint);
    }

    removeStraightLinePoints(path);

    return path;
  }

  private calculateRay(
    point: Vec2,
    target: Vec2,
    blockId: EntityId | null,
  ): Ray {
    let direction: Vec2;

    if (blockId) {
      const result = this.exitClosestSide(point, blockId);
      direction = result.direction;
    } else {
      direction = getDominantDirection(point, target);
    }

    return Ray.fromPoints(point, direction);
  }

  private exitClosestSide(
    point: Vec2,
    blockId: EntityId,
  ): { direction: Vec2; distance: number } {
    const block = Block.read(this.ctx, blockId);
    const center = Block.getCenter(this.ctx, blockId);

    // Transform point to world space for geometry tests
    // (point is in local/arrow-aligned space)
    const worldPoint = this.transformToWorld(point);

    const nudgedPoint = Vec2.clone(worldPoint);
    const offset = Vec2.clone(center);
    Vec2.sub(offset, worldPoint);
    Vec2.scale(offset, 0.01);
    Vec2.add(nudgedPoint, offset);

    // Base directions aligned to arrow's rotation axis (local space)
    const baseDirections: Vec2[] = [
      [0, -1], // up
      [1, 0], // right
      [0, 1], // down
      [-1, 0], // left
    ];

    // Rotate directions to world space for intersection testing
    const worldDirections: Vec2[] = baseDirections.map((dir) => {
      const worldDir = Vec2.clone(dir);
      Vec2.rotate(worldDir, this.rotation);
      return worldDir;
    });

    // Track all valid exit directions and their distances
    const exits: { direction: Vec2; distance: number }[] = [];

    for (let i = 0; i < worldDirections.length; i++) {
      const worldDir = worldDirections[i];
      const ray = Ray.fromPoints(nudgedPoint, worldDir);
      const intersections = Ray.intersectRect(
        ray,
        block.position,
        block.size,
        block.rotateZ,
      );
      if (intersections.length === 0) {
        continue;
      }

      exits.push({
        direction: baseDirections[i],
        distance: intersections[0].distance,
      });
    }

    if (exits.length === 0) {
      console.error("[exitClosestSide] No valid exit direction found!", {
        point,
        nudgedPoint,
        blockPosition: block.position,
        blockSize: block.size,
        blockRotateZ: block.rotateZ,
        center,
      });
      return { direction: [0, -1], distance: 0 };
    }

    // Sort by distance to find closest
    exits.sort((a, b) => a.distance - b.distance);
    const closest = exits[0];

    // Calculate UV of point within block to check if near center
    const u = (worldPoint[0] - block.position[0]) / block.size[0];
    const v = (worldPoint[1] - block.position[1]) / block.size[1];

    // If point is close to center (UV near 0.5, 0.5), use dominant direction
    const CENTER_THRESHOLD = 0.2;
    if (
      Math.abs(u - 0.5) < CENTER_THRESHOLD &&
      Math.abs(v - 0.5) < CENTER_THRESHOLD
    ) {
      const dominantDir = getDominantDirection(point, this.localEnd);
      const dominantExit = exits.find(
        (e) =>
          e.direction[0] === dominantDir[0] &&
          e.direction[1] === dominantDir[1],
      );
      if (dominantExit) {
        return dominantExit;
      }
    }

    return closest;
  }
}

function routePointToPoint(start: Vec2, end: Vec2): Vec2[] {
  const path: Vec2[] = [];

  path.push(start);

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  // When points are nearly collinear (horizontal or vertical line),
  // return a direct path without intermediate elbow points
  if (Scalar.approxEqual(dy, 0)) {
    // Horizontal line - just start and end
    path.push(end);
    return path;
  }
  if (Scalar.approxEqual(dx, 0)) {
    // Vertical line - just start and end
    path.push(end);
    return path;
  }

  const dominantDirection = getDominantDirection(start, end);

  let distance: number;
  if (dominantDirection[0] === 1) {
    distance = dx;
  } else if (dominantDirection[0] === -1) {
    distance = -dx;
  } else if (dominantDirection[1] === 1) {
    distance = dy;
  } else {
    distance = -dy;
  }

  const intermediatePoint: Vec2 = [
    start[0] + (dominantDirection[0] * distance) / 2,
    start[1] + (dominantDirection[1] * distance) / 2,
  ];
  path.push(intermediatePoint);

  if (dominantDirection[0] === 0) {
    path.push([end[0], intermediatePoint[1]]);
  } else {
    path.push([intermediatePoint[0], end[1]]);
  }

  path.push(end);

  return path;
}

function removeDuplicates(path: Vec2[]): void {
  if (path.length < 2) return;

  const uniquePath: Vec2[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const prev = uniquePath[uniquePath.length - 1];
    const current = path[i];
    const sameX = Scalar.approxEqual(prev[0], current[0]);
    const sameY = Scalar.approxEqual(prev[1], current[1]);
    if (!sameX || !sameY) {
      uniquePath.push(current);
    }
  }

  path.length = 0;
  path.push(...uniquePath);
}

function removeStraightLinePoints(path: Vec2[]): void {
  if (path.length < 3) return;

  const pathIndicesToRemove: number[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    const collinearX =
      Scalar.approxEqual(prev[0], current[0]) &&
      Scalar.approxEqual(current[0], next[0]);
    const collinearY =
      Scalar.approxEqual(prev[1], current[1]) &&
      Scalar.approxEqual(current[1], next[1]);

    if (collinearX || collinearY) {
      pathIndicesToRemove.push(i);
    }
  }

  for (let i = pathIndicesToRemove.length - 1; i >= 0; i--) {
    path.splice(pathIndicesToRemove[i], 1);
  }
}

function removeZigZagPoints(path: Vec2[]): void {
  if (path.length < 3) return;

  const turns: TurnDirection[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    const turn = getTurnDirection(prev, current, next);
    turns.push(turn);
  }

  const pathIndicesToRemove: number[] = [];
  for (let i = 1; i < turns.length - 1; i++) {
    const prev = turns[i - 1];
    const current = turns[i];
    const next = turns[i + 1];

    if (
      (prev === "left" && current === "right" && next === "left") ||
      (prev === "right" && current === "left" && next === "right")
    ) {
      const EPSILON = 1e-6;
      const sameX = Math.abs(path[i + 1][0] - path[i][0]) < EPSILON;
      const sameY = Math.abs(path[i + 1][1] - path[i][1]) < EPSILON;

      if (sameX) {
        path[i + 1][0] = path[i + 2][0];
        path[i + 1][1] = path[i][1];
      } else if (sameY) {
        path[i + 1][0] = path[i][0];
        path[i + 1][1] = path[i + 2][1];
      } else {
        // Neither axis aligned - skip this zigzag removal to avoid creating diagonals
        continue;
      }

      pathIndicesToRemove.push(i);
      pathIndicesToRemove.push(i + 2);
    }
  }

  for (let i = pathIndicesToRemove.length - 1; i >= 0; i--) {
    path.splice(pathIndicesToRemove[i], 1);
  }
}

function getTurnDirection(a: Vec2, b: Vec2, c: Vec2): TurnDirection {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return cross > 0 ? "left" : "right";
}

function extendAabbsToMeet(aabb1: Aabb, aabb2: Aabb): void {
  if (Aabb.intersects(aabb1, aabb2)) return;

  // Indices: 0=left, 1=top, 2=right, 3=bottom
  if (aabb1[2] < aabb2[0]) {
    const midPoint = (aabb1[2] + aabb2[0]) / 2;
    aabb1[2] = midPoint;
    aabb2[0] = midPoint;
  } else if (aabb2[2] < aabb1[0]) {
    const midPoint = (aabb2[2] + aabb1[0]) / 2;
    aabb2[2] = midPoint;
    aabb1[0] = midPoint;
  }

  if (aabb1[3] < aabb2[1]) {
    const midPoint = (aabb1[3] + aabb2[1]) / 2;
    aabb1[3] = midPoint;
    aabb2[1] = midPoint;
  } else if (aabb2[3] < aabb1[1]) {
    const midPoint = (aabb2[3] + aabb1[1]) / 2;
    aabb2[3] = midPoint;
    aabb1[1] = midPoint;
  }
}

function perimeterToNodes(perimeter: Vec2[]): Node[] {
  const nodes: Node[] = perimeter.map((corner, index) => ({
    id: index,
    connections: [],
    distances: {},
    coords: corner,
  }));

  connectAdjacentNodes(nodes, 0);
  connectAdjacentNodes(nodes, 1);

  return nodes;
}

function connectAdjacentNodes(nodes: Node[], dim: number): void {
  const grouped: { [key: number]: Node[] } = {};
  const otherDim = 1 - dim;

  for (const node of nodes) {
    const coord = Math.round(node.coords[dim]);
    if (!grouped[coord]) {
      grouped[coord] = [];
    }
    grouped[coord].push(node);
  }

  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.coords[otherDim] - b.coords[otherDim]);
    for (let i = 0; i < group.length - 1; i++) {
      const nodeA = group[i];
      const nodeB = group[i + 1];
      nodeA.connections.push(nodeB.id);
      nodeB.connections.push(nodeA.id);
      const distance = Math.abs(
        nodeB.coords[otherDim] - nodeA.coords[otherDim],
      );
      nodeA.distances[nodeB.id] = distance;
      nodeB.distances[nodeA.id] = distance;
    }
  }
}

function getNodes(aabb1: Aabb, aabb2: Aabb): Node[] {
  if (!Aabb.intersects(aabb1, aabb2)) {
    return [];
  }

  const perimeter: Vec2[] = [];

  const corners1 = Aabb.corners(aabb1);
  const corners2 = Aabb.corners(aabb2);

  for (const corner of corners1) {
    if (!Aabb.containsPoint(aabb2, corner, false)) {
      perimeter.push(corner);
    }
  }

  for (const corner of corners2) {
    if (!Aabb.containsPoint(aabb1, corner, false)) {
      perimeter.push(corner);
    }
  }

  const intersectionAabb = Aabb.clone(aabb1);
  Aabb.intersection(intersectionAabb, aabb2);

  const intersectionCorners = Aabb.corners(intersectionAabb);
  for (const corner of intersectionCorners) {
    if (
      !(
        Aabb.containsPoint(aabb1, corner, false) ||
        Aabb.containsPoint(aabb2, corner, false)
      )
    ) {
      perimeter.push(corner);
    }
  }

  const uniquePerimeter: Vec2[] = [];
  const seen = new Set<string>();
  for (const point of perimeter) {
    const key = point.map(Math.round).join(",");
    if (!seen.has(key)) {
      uniquePerimeter.push(point);
      seen.add(key);
    }
  }

  return perimeterToNodes(uniquePerimeter);
}

function intersectRayAndAddNode(ray: Ray, nodes: Node[]): number | null {
  const rayOrigin = Ray.origin(ray);
  const preexistingNode = nodes.find(
    (n) => n.coords[0] === rayOrigin[0] && n.coords[1] === rayOrigin[1],
  );
  if (preexistingNode) {
    return preexistingNode.id;
  }

  let nearestIntersection: RayIntersection | null = null;
  let intersectedNodeId = -1;
  let intersectedNeighborId = -1;

  for (const node of nodes) {
    for (const neighborId of node.connections) {
      if (node.id >= neighborId) continue;

      const neighbor = nodes.find((n) => n.id === neighborId);
      if (!neighbor) continue;

      const intersection = Ray.intersectSegment(
        ray,
        node.coords,
        neighbor.coords,
      );

      if (
        intersection &&
        (nearestIntersection === null ||
          intersection.distance < nearestIntersection.distance)
      ) {
        nearestIntersection = intersection;
        intersectedNodeId = node.id;
        intersectedNeighborId = neighborId;
      }
    }
  }

  if (
    !nearestIntersection ||
    intersectedNodeId === -1 ||
    intersectedNeighborId === -1
  ) {
    console.warn(
      "[intersectRayAndAddNode] No intersection found for ray",
      ray,
      nearestIntersection,
      intersectedNodeId,
      intersectedNeighborId,
    );

    return null;
  }

  const newNodeId = nodes.length;
  const newNode: Node = {
    id: newNodeId,
    connections: [],
    distances: {},
    coords: nearestIntersection.point,
  };

  const startNode = nodes[intersectedNodeId];
  const endNode = nodes[intersectedNeighborId];

  const distanceToStart = Math.hypot(
    nearestIntersection.point[0] - startNode.coords[0],
    nearestIntersection.point[1] - startNode.coords[1],
  );
  const distanceToEnd = Math.hypot(
    nearestIntersection.point[0] - endNode.coords[0],
    nearestIntersection.point[1] - endNode.coords[1],
  );

  newNode.connections.push(intersectedNodeId, intersectedNeighborId);
  newNode.distances[intersectedNodeId] = distanceToStart;
  newNode.distances[intersectedNeighborId] = distanceToEnd;

  startNode.connections.push(newNodeId);
  startNode.distances[newNodeId] = distanceToStart;

  endNode.connections.push(newNodeId);
  endNode.distances[newNodeId] = distanceToEnd;

  startNode.connections = startNode.connections.filter(
    (id) => id !== intersectedNeighborId,
  );
  delete startNode.distances[intersectedNeighborId];

  endNode.connections = endNode.connections.filter(
    (id) => id !== intersectedNodeId,
  );
  delete endNode.distances[intersectedNodeId];

  nodes.push(newNode);

  return newNodeId;
}

function shortestPathInGraph(
  nodes: Node[],
  startId: number,
  endId: number,
): number[] | null {
  const distances: { [key: number]: number } = {};
  const previous: { [key: number]: number | null } = {};
  const heap = new MinHeap();

  for (const node of nodes) {
    distances[node.id] = Number.POSITIVE_INFINITY;
    previous[node.id] = null;
  }

  distances[startId] = 0;
  heap.insert(startId, 0);

  while (!heap.isEmpty()) {
    const current = heap.extractMin();
    if (!current) break;

    const currentId = current.id;

    if (currentId === endId) {
      const path: number[] = [];
      let step: number | null = endId;
      while (step !== null) {
        path.unshift(step);
        step = previous[step];
      }

      return path;
    }

    const currentNode = nodes.find((node) => node.id === currentId);
    if (!currentNode) continue;

    for (const neighborId of currentNode.connections) {
      const alt =
        distances[currentId] + (currentNode.distances[neighborId] || 1);

      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;

        if (heap.contains(neighborId)) {
          heap.decreaseKey(neighborId, alt);
        } else {
          heap.insert(neighborId, alt);
        }
      }
    }
  }

  return null;
}

function getDominantDirection(start: Vec2, end: Vec2): Vec2 {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  if (Math.abs(dx) > Math.abs(dy)) {
    return [Math.sign(dx), 0];
  }

  return [0, Math.sign(dy)];
}
