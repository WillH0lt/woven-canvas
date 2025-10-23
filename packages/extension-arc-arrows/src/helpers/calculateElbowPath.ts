import { Aabb, Block } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import { MinHeap } from './MinHeap'

const PADDING = 50

interface Ray {
  origin: [number, number]
  direction: [number, number]
}

interface Intersection {
  point: [number, number]
  distance: number
}

interface Node {
  id: number
  connections: number[]
  distances: { [key: number]: number }
  coords: [number, number]
}

type TurnDirection = 'left' | 'right'

export function calculateElbowPath(
  start: [number, number],
  end: [number, number],
  startBlockEntity: Entity | undefined,
  endBlockEntity: Entity | undefined,
): [number, number][] {
  const startRay = calculateRay(start, end, startBlockEntity)
  const endRay = calculateRay(end, start, endBlockEntity)

  let path: [number, number][]

  if (startBlockEntity && endBlockEntity) {
    path = routeBlockToBlock(startBlockEntity, endBlockEntity, startRay, endRay)
  } else if (startBlockEntity && !endBlockEntity) {
    path = routeBlockToPoint(startBlockEntity, startRay, end)
  } else if (!startBlockEntity && endBlockEntity) {
    path = routeBlockToPoint(endBlockEntity, endRay, start).reverse()
  } else {
    path = routePointToPoint(startRay.origin, end)
  }

  return path
}

function routeBlockToBlock(
  startBlockEntity: Entity,
  endBlockEntity: Entity,
  startRay: Ray,
  endRay: Ray,
): [number, number][] {
  const startBlock = startBlockEntity.read(Block)
  const startAabb = startBlock.computeAabb()

  const endBlock = endBlockEntity.read(Block)
  const endAabb = endBlock.computeAabb()

  startAabb.applyPadding(PADDING)
  endAabb.applyPadding(PADDING)

  extendAabbsToMeet(startAabb, endAabb)

  const nodes = getNodes(startAabb, endAabb)

  const startId = intersectRayAndAddNode(startRay, nodes)
  const endId = intersectRayAndAddNode(endRay, nodes)

  if (startId === null || endId === null) {
    console.warn('Failed to add start or end node to graph')
    return [startRay.origin, endRay.origin]
  }

  const nodePath = shortestPathInGraph(nodes, startId, endId)
  if (nodePath === null) {
    console.warn('No path found between blocks')
    return [startRay.origin, endRay.origin]
  }

  const path: [number, number][] = [startRay.origin]
  for (const nodeId of nodePath) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      path.push(node.coords)
    }
  }
  path.push(endRay.origin)

  removeStraightLinePoints(path)
  removeZigZagPoints(path)

  return path
}

function routeBlockToPoint(blockEntity: Entity, ray: Ray, endPoint: [number, number]): [number, number][] {
  const block = blockEntity.read(Block)

  const dominantDirection = getDominantDirection(ray.origin, endPoint)
  if (ray.direction[0] === dominantDirection[0] && ray.direction[1] === dominantDirection[1]) {
    // ray is already heading in the right direction, just do a simple route
    return routePointToPoint(ray.origin, endPoint)
  }

  const aabb = block.computeAabb()
  aabb.applyPadding(PADDING)

  const endRay: Ray = {
    origin: endPoint,
    direction: [-dominantDirection[0], -dominantDirection[1]],
  }

  const intersects = rayIntersectAabb(endRay, aabb)
  if (intersects.length === 0) {
    aabb.expandByPoint(endPoint)
  }

  const perimeter = aabb.getCorners()
  const nodes = perimeterToNodes(perimeter)

  const endId = intersectRayAndAddNode(endRay, nodes)
  const startId = intersectRayAndAddNode(ray, nodes)

  if (startId === null || endId === null) {
    console.warn('Failed to add start or end node to graph')
    return [ray.origin, endRay.origin]
  }

  const nodePath = shortestPathInGraph(nodes, startId, endId)
  if (nodePath === null) {
    console.warn('No path found between blocks')
    return [ray.origin, endRay.origin]
  }

  const path: [number, number][] = [ray.origin]
  for (const nodeId of nodePath) {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      path.push(node.coords)
    }
  }

  if (intersects.length > 0) {
    path.push(endPoint)
  }

  removeStraightLinePoints(path)

  return path
}

function routePointToPoint(start: [number, number], end: [number, number]): [number, number][] {
  const path: [number, number][] = []

  path.push(start)

  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dominantDirection = getDominantDirection(start, end)

  // get distance to move in dominant direction
  let distance: number
  if (dominantDirection[0] === 1) {
    distance = dx
  } else if (dominantDirection[0] === -1) {
    distance = -dx
  } else if (dominantDirection[1] === 1) {
    distance = dy
  } else {
    distance = -dy
  }

  // move in dominant direction halfway
  const intermediatePoint: [number, number] = [
    start[0] + (dominantDirection[0] * distance) / 2,
    start[1] + (dominantDirection[1] * distance) / 2,
  ]
  path.push(intermediatePoint)

  // now move perpendicularly to be level with the end point
  if (dominantDirection[0] === 0) {
    // moving vertically, so move horizontally now
    path.push([end[0], intermediatePoint[1]])
  } else {
    // moving horizontally, so move vertically now
    path.push([intermediatePoint[0], end[1]])
  }

  // finally move to the end point
  path.push(end)

  return path
}

function removeStraightLinePoints(path: [number, number][]): void {
  if (path.length < 3) return

  // if there's a sequence of three corners that are collinear, remove the middle point
  const pathIndicesToRemove: number[] = []
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const current = path[i]
    const next = path[i + 1]

    if ((prev[0] === current[0] && current[0] === next[0]) || (prev[1] === current[1] && current[1] === next[1])) {
      pathIndicesToRemove.push(i)
    }
  }

  // remove points in reverse order so indices don't get messed up
  for (let i = pathIndicesToRemove.length - 1; i >= 0; i--) {
    path.splice(pathIndicesToRemove[i], 1)
  }
}

function removeZigZagPoints(path: [number, number][]): void {
  if (path.length < 3) return

  // if there's a sequence of three corners that take a left-right-left or right-left-right turn,
  // move the middle point so that it's a single turn instead

  const turns: TurnDirection[] = []
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const current = path[i]
    const next = path[i + 1]

    const turn = getTurnDirection(prev, current, next)
    turns.push(turn)
  }

  // look for left-right-left or right-left-right patterns
  const pathIndicesToRemove: number[] = []
  for (let i = 1; i < turns.length - 1; i++) {
    const prev = turns[i - 1]
    const current = turns[i]
    const next = turns[i + 1]

    if (
      (prev === 'left' && current === 'right' && next === 'left') ||
      (prev === 'right' && current === 'left' && next === 'right')
    ) {
      if (path[i + 1][0] === path[i][0]) {
        path[i + 1][0] = path[i + 2][0]
        path[i + 1][1] = path[i][1]
      } else if (path[i + 1][1] === path[i][1]) {
        path[i + 1][0] = path[i][0]
        path[i + 1][1] = path[i + 2][1]
      }

      pathIndicesToRemove.push(i)
      pathIndicesToRemove.push(i + 2)
    }
  }

  // remove points in reverse order so indices don't get messed up
  for (let i = pathIndicesToRemove.length - 1; i >= 0; i--) {
    path.splice(pathIndicesToRemove[i], 1)
  }
}

function getTurnDirection(a: [number, number], b: [number, number], c: [number, number]): TurnDirection {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  return cross > 0 ? 'left' : 'right'
}

function extendAabbsToMeet(aabb1: Aabb, aabb2: Aabb): void {
  if (aabb1.intersectsAabb(aabb2)) return

  // Extend horizontally to meet
  if (aabb1.right < aabb2.left) {
    // aabb1 is to the left of aabb2
    const midPoint = (aabb1.right + aabb2.left) / 2
    aabb1.right = midPoint
    aabb2.left = midPoint
  } else if (aabb2.right < aabb1.left) {
    // aabb2 is to the left of aabb1
    const midPoint = (aabb2.right + aabb1.left) / 2
    aabb2.right = midPoint
    aabb1.left = midPoint
  }

  // Extend vertically to meet
  if (aabb1.bottom < aabb2.top) {
    // aabb1 is above aabb2
    const midPoint = (aabb1.bottom + aabb2.top) / 2
    aabb1.bottom = midPoint
    aabb2.top = midPoint
  } else if (aabb2.bottom < aabb1.top) {
    // aabb2 is above aabb1
    const midPoint = (aabb2.bottom + aabb1.top) / 2
    aabb2.bottom = midPoint
    aabb1.top = midPoint
  }
}

function perimeterToNodes(perimeter: [number, number][]): Node[] {
  const nodes: Node[] = perimeter.map((corner, index) => ({
    id: index,
    connections: [],
    distances: {},
    coords: corner,
  }))

  connectAdjacentNodes(nodes, 0)
  connectAdjacentNodes(nodes, 1)

  return nodes
}

function connectAdjacentNodes(nodes: Node[], dim: number): void {
  // Group nodes by their coordinate in the given dimension (0 for x, 1 for y)
  const grouped: { [key: number]: Node[] } = {}

  const otherDim = 1 - dim

  for (const node of nodes) {
    const coord = Math.round(node.coords[dim])
    if (!grouped[coord]) {
      grouped[coord] = []
    }
    grouped[coord].push(node)
  }

  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.coords[otherDim] - b.coords[otherDim])
    for (let i = 0; i < group.length - 1; i++) {
      const nodeA = group[i]
      const nodeB = group[i + 1]
      nodeA.connections.push(nodeB.id)
      nodeB.connections.push(nodeA.id)
      const distance = Math.abs(nodeB.coords[otherDim] - nodeA.coords[otherDim])
      nodeA.distances[nodeB.id] = distance
      nodeB.distances[nodeA.id] = distance
    }
  }
}

function getNodes(aabb1: Aabb, aabb2: Aabb): Node[] {
  if (!aabb1.intersectsAabb(aabb2)) {
    console.warn('getNodes called with non-intersecting AABBs', aabb1, aabb2)
    return []
  }

  // Handle the case where the two AABBs intersect
  // Trace around the perimeter of the merged shape to create nodes
  const perimeter: [number, number][] = []

  const corners1 = aabb1.getCorners()
  const corners2 = aabb2.getCorners()

  for (const corner of corners1) {
    if (!aabb2.containsPoint(corner, false)) {
      perimeter.push(corner)
    }
  }

  for (const corner of corners2) {
    if (!aabb1.containsPoint(corner, false)) {
      perimeter.push(corner)
    }
  }

  // The aabb enclosed by both
  const unionAabb = new Aabb({
    left: Math.max(aabb1.left, aabb2.left),
    right: Math.min(aabb1.right, aabb2.right),
    top: Math.max(aabb1.top, aabb2.top),
    bottom: Math.min(aabb1.bottom, aabb2.bottom),
  })

  const unionCorners = unionAabb.getCorners()
  for (const corner of unionCorners) {
    if (!(aabb1.containsPoint(corner, false) || aabb2.containsPoint(corner, false))) {
      perimeter.push(corner)
    }
  }

  // remove duplicates
  const uniquePerimeter: [number, number][] = []
  const seen = new Set<string>()
  for (const point of perimeter) {
    const key = point.map(Math.round).join(',')
    if (!seen.has(key)) {
      uniquePerimeter.push(point)
      seen.add(key)
    }
  }

  return perimeterToNodes(uniquePerimeter)
}

function intersectRayAndAddNode(ray: Ray, nodes: Node[]): number | null {
  // if we intersected at a node already, just return that node id
  const preexistingNode = nodes.find((n) => n.coords[0] === ray.origin[0] && n.coords[1] === ray.origin[1])
  if (preexistingNode) {
    return preexistingNode.id
  }

  // find the nearest segment intersected by the ray and add a node at the intersection point
  let nearestIntersection: Intersection | null = null
  let intersectedNodeId = -1
  let intersectedNeighborId = -1

  // Check intersection with each edge in the graph
  for (const node of nodes) {
    for (const neighborId of node.connections) {
      // Only check each edge once (avoid checking both directions)
      if (node.id >= neighborId) continue

      const neighbor = nodes.find((n) => n.id === neighborId)
      if (!neighbor) continue

      const intersection = rayIntersectSegment(ray, node.coords, neighbor.coords)

      if (intersection && (nearestIntersection === null || intersection.distance < nearestIntersection.distance)) {
        nearestIntersection = intersection
        intersectedNodeId = node.id
        intersectedNeighborId = neighborId
      }
    }
  }

  if (!nearestIntersection || intersectedNodeId === -1 || intersectedNeighborId === -1) {
    return null // No intersection found
  }

  // Create a new node at the intersection point
  const newNodeId = nodes.length
  const newNode: Node = {
    id: newNodeId,
    connections: [],
    distances: {},
    coords: nearestIntersection.point,
  }

  // Get the nodes at both ends of the intersected segment
  const startNode = nodes[intersectedNodeId]
  const endNode = nodes[intersectedNeighborId]

  // Calculate distances from intersection point to segment endpoints
  const distanceToStart = Math.hypot(
    nearestIntersection.point[0] - startNode.coords[0],
    nearestIntersection.point[1] - startNode.coords[1],
  )
  const distanceToEnd = Math.hypot(
    nearestIntersection.point[0] - endNode.coords[0],
    nearestIntersection.point[1] - endNode.coords[1],
  )

  // Connect new node to start and end nodes
  newNode.connections.push(intersectedNodeId, intersectedNeighborId)
  newNode.distances[intersectedNodeId] = distanceToStart
  newNode.distances[intersectedNeighborId] = distanceToEnd

  // Connect start and end nodes to the new node
  startNode.connections.push(newNodeId)
  startNode.distances[newNodeId] = distanceToStart

  endNode.connections.push(newNodeId)
  endNode.distances[newNodeId] = distanceToEnd

  // Remove the direct connection between start and end nodes
  startNode.connections = startNode.connections.filter((id) => id !== intersectedNeighborId)
  delete startNode.distances[intersectedNeighborId]

  endNode.connections = endNode.connections.filter((id) => id !== intersectedNodeId)
  delete endNode.distances[intersectedNodeId]

  // Add the new node to the nodes array
  nodes.push(newNode)

  return newNodeId
}

function shortestPathInGraph(nodes: Node[], startId: number, endId: number): number[] | null {
  // uses dijkstra's algorithm with a min-heap priority queue
  const distances: { [key: number]: number } = {}
  const previous: { [key: number]: number | null } = {}
  const heap = new MinHeap()

  for (const node of nodes) {
    distances[node.id] = Number.POSITIVE_INFINITY
    previous[node.id] = null
  }

  distances[startId] = 0
  heap.insert(startId, 0)

  while (!heap.isEmpty()) {
    const current = heap.extractMin()
    if (!current) break

    const currentId = current.id

    if (currentId === endId) {
      const path: number[] = []
      let step: number | null = endId
      while (step !== null) {
        path.unshift(step)
        step = previous[step]
      }

      return path
    }

    const currentNode = nodes.find((node) => node.id === currentId)
    if (!currentNode) continue

    for (const neighborId of currentNode.connections) {
      const alt = distances[currentId] + (currentNode.distances[neighborId] || 1)

      if (alt < distances[neighborId]) {
        distances[neighborId] = alt
        previous[neighborId] = currentId

        if (heap.contains(neighborId)) {
          heap.decreaseKey(neighborId, alt)
        } else {
          heap.insert(neighborId, alt)
        }
      }
    }
  }

  return null // No path found
}

function getDominantDirection(start: [number, number], end: [number, number]): [number, number] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]

  if (Math.abs(dx) > Math.abs(dy)) {
    return [Math.sign(dx), 0]
  }

  return [0, Math.sign(dy)]
}

function rayRayIntersection(ray1: Ray, ray2: Ray): Intersection | null {
  const [x1, y1] = ray1.origin
  const [dx1, dy1] = ray1.direction
  const [x2, y2] = ray2.origin
  const [dx2, dy2] = ray2.direction

  // Calculate determinant for parallel check
  const det = dx1 * dy2 - dy1 * dx2

  // If determinant is 0, lines are parallel
  if (Math.abs(det) < 1e-10) {
    return null
  }

  // Calculate intersection parameters
  const dx = x2 - x1
  const dy = y2 - y1

  const u = (dx * dy2 - dy * dx2) / det // Parameter for ray1
  const v = (dx * dy1 - dy * dx1) / det // Parameter for ray2

  // Check if intersection is on both rays (u >= 0 and v >= 0)
  if (u >= 0 && v >= 0) {
    const intersectionX = x1 + u * dx1
    const intersectionY = y1 + u * dy1

    return {
      point: [intersectionX, intersectionY],
      distance: u * Math.sqrt(dx1 * dx1 + dy1 * dy1),
    }
  }

  return null
}

function calculateRay(point: [number, number], target: [number, number], blockEntity: Entity | undefined): Ray {
  let direction: [number, number]

  // Determine the ray directions
  if (blockEntity) {
    // if we're inside the start block, exit from the closest side
    const result = exitClosestSide(point, blockEntity)
    direction = result.direction
  } else {
    direction = getDominantDirection(point, target)
  }

  const ray = {
    origin: point,
    direction,
  }

  return ray
}

function exitClosestSide(
  point: [number, number],
  blockEntity: Entity,
): { direction: [number, number]; distance: number } {
  const block = blockEntity.read(Block)

  const directions: [number, number][] = [
    [0, -1], // up
    [1, 0], // right
    [0, 1], // down
    [-1, 0], // left
  ]

  let bestDirection: [number, number] = [0, 0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const direction of directions) {
    const intersections = rayIntersectBlock({ origin: point, direction }, block)
    if (intersections.length === 0) {
      continue
    }

    const intersection = intersections[0]

    if (intersection.distance < bestDistance) {
      bestDistance = intersection.distance
      bestDirection = direction
    }
  }

  return { direction: bestDirection, distance: bestDistance }
}

function rayIntersectBlock(ray: Ray, block: Block): Intersection[] {
  const corners = block.getCorners()
  const edges: [[number, number], [number, number]][] = []
  for (let i = 0; i < 4; i++) {
    edges.push([corners[i], corners[(i + 1) % 4]])
  }

  const intersections: Intersection[] = []

  for (const edge of edges) {
    const edgeIntersection = rayIntersectSegment(ray, edge[0], edge[1])
    if (edgeIntersection) {
      intersections.push(edgeIntersection)
    }
  }

  // sort by distance
  intersections.sort((a, b) => a.distance - b.distance)

  return intersections
}

function rayIntersectAabb(ray: Ray, aabb: Aabb): Intersection[] {
  const intersections: Intersection[] = []

  if (ray.origin[0] >= aabb.left && ray.origin[0] <= aabb.right) {
    if ((ray.origin[1] < aabb.bottom && ray.direction[1] > 0) || (ray.origin[1] > aabb.top && ray.direction[1] < 0)) {
      // intersect top edge
      const distance = aabb.top - ray.origin[1]
      intersections.push({
        point: [ray.origin[0], aabb.top],
        distance,
      })
    }
    if ((ray.origin[1] > aabb.top && ray.direction[1] < 0) || (ray.origin[1] < aabb.bottom && ray.direction[1] > 0)) {
      // intersect bottom edge
      const distance = aabb.bottom - ray.origin[1]
      intersections.push({
        point: [ray.origin[0], aabb.bottom],
        distance,
      })
    }
  }
  if (ray.origin[1] >= aabb.top && ray.origin[1] <= aabb.bottom) {
    if ((ray.origin[0] < aabb.left && ray.direction[0] > 0) || (ray.origin[0] > aabb.left && ray.direction[0] < 0)) {
      // intersect left edge
      const distance = aabb.left - ray.origin[0]
      intersections.push({
        point: [aabb.left, ray.origin[1]],
        distance,
      })
    }
    if ((ray.origin[0] > aabb.left && ray.direction[0] < 0) || (ray.origin[0] < aabb.right && ray.direction[0] > 0)) {
      // intersect right edge
      const distance = aabb.right - ray.origin[0]
      intersections.push({
        point: [aabb.right, ray.origin[1]],
        distance,
      })
    }
  }

  // sort by distance
  intersections.sort((a, b) => a.distance - b.distance)

  return intersections
}

function rayIntersectSegment(ray: Ray, a: [number, number], b: [number, number]): Intersection | null {
  const [x1, y1] = ray.origin
  const [dx1, dy1] = ray.direction
  const [x2, y2] = a
  const [x3, y3] = b

  // Segment direction vector
  const dx2 = x3 - x2
  const dy2 = y3 - y2

  // Calculate determinant for parallel check
  const det = dx1 * dy2 - dy1 * dx2

  // If determinant is 0, lines are parallel
  if (Math.abs(det) < 1e-10) {
    return intersectCollinearRayAndSegment(ray, a, b)
  }

  // Calculate intersection parameters
  const dx = x2 - x1
  const dy = y2 - y1

  const u = (dx * dy2 - dy * dx2) / det // Parameter for ray
  const v = (dx * dy1 - dy * dx1) / det // Parameter for segment

  // Check if intersection is on the ray (u >= 0) and on the segment (0 <= v <= 1)
  if (u >= 0 && v >= 0 && v <= 1) {
    const intersectionX = x1 + u * dx1
    const intersectionY = y1 + u * dy1

    return {
      point: [intersectionX, intersectionY],
      distance: u * Math.sqrt(dx1 * dx1 + dy1 * dy1),
    }
  }

  return null
}

function intersectCollinearRayAndSegment(ray: Ray, a: [number, number], b: [number, number]): Intersection | null {
  // Handle degenerate segment (point)
  if (a[0] === b[0] && a[1] === b[1]) {
    if (ray.origin[0] === a[0] && ray.origin[1] === a[1]) {
      return {
        point: [ray.origin[0], ray.origin[1]],
        distance: 0,
      }
    }
    return null
  }

  // Try horizontal alignment (dimension 0)
  if (ray.direction[1] === 0 && a[1] === b[1] && ray.origin[1] === a[1]) {
    return intersectAlignedRayAndSegment(ray, a, b, 0)
  }

  // Try vertical alignment (dimension 1)
  if (ray.direction[0] === 0 && a[0] === b[0] && ray.origin[0] === a[0]) {
    return intersectAlignedRayAndSegment(ray, a, b, 1)
  }

  return null // Not collinear
}

function intersectAlignedRayAndSegment(
  ray: Ray,
  a: [number, number],
  b: [number, number],
  dimension: 0 | 1,
): Intersection | null {
  // Check if ray origin is on the segment
  const min = Math.min(a[dimension], b[dimension])
  const max = Math.max(a[dimension], b[dimension])
  if (ray.origin[dimension] >= min && ray.origin[dimension] <= max) {
    return {
      point: [ray.origin[0], ray.origin[1]],
      distance: 0,
    }
  }

  // Find nearest intersection point
  const candidates: { point: [number, number]; distance: number }[] = []

  if (ray.direction[dimension] > 0) {
    // Ray pointing in positive direction
    if (a[dimension] >= ray.origin[dimension]) {
      candidates.push({ point: a, distance: a[dimension] - ray.origin[dimension] })
    }
    if (b[dimension] >= ray.origin[dimension]) {
      candidates.push({ point: b, distance: b[dimension] - ray.origin[dimension] })
    }
  } else if (ray.direction[dimension] < 0) {
    // Ray pointing in negative direction
    if (a[dimension] <= ray.origin[dimension]) {
      candidates.push({ point: a, distance: ray.origin[dimension] - a[dimension] })
    }
    if (b[dimension] <= ray.origin[dimension]) {
      candidates.push({ point: b, distance: ray.origin[dimension] - b[dimension] })
    }
  }

  if (candidates.length === 0) return null
  return candidates.reduce((nearest, current) => (current.distance < nearest.distance ? current : nearest))
}
