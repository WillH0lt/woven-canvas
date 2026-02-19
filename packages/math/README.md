# @woven-canvas/math

Memory-efficient math utilities used by woven-canvas.

## Installation

```bash
npm install @woven-canvas/math
```

## Usage

```typescript
import { Vec2, Rect, Aabb, Mat2 } from "@woven-canvas/math";

// Vector operations (mutating API - modifies first argument in place)
const a = Vec2.create(10, 20);
const b = Vec2.create(5, 10);
Vec2.add(a, b); // a is now [15, 30]

// Axis-aligned bounding box
const aabb = Aabb.fromPoints([a, b]);
const contains = Aabb.containsPoint(aabb, Vec2.create(7, 15));

// Rectangle geometry (position + size based)
const position: Vec2 = [0, 0];
const size: Vec2 = [100, 50];
const center: Vec2 = [0, 0];
Rect.getCenter(position, size, center);

// Matrix transformations (2x3 affine matrix)
const mat = Mat2.fromRotation(Math.PI / 4);
const point = Vec2.create(10, 0);
Mat2.transformPoint(mat, point);
```

## Modules

### Vec2

2D vector as tuple `[x, y]`. Operations are mutating (modify first argument in place).

- **Creation**: `create`, `zero`, `clone`
- **Geometry**: `dot`, `length`, `lengthSq`, `distance`, `distanceSq`, `midPoint`, `angle`, `angleTo`, `fromPolar`
- **Mutation**: `set`, `copy`, `add`, `addScalar`, `sub`, `scale`, `multiply`, `divide`, `negate`, `normalize`, `rotate`, `rotateAround`

### Rect

Rectangle as position `[x, y]` + size `[width, height]`, with optional rotation.

- **Getters**: `getCenter`, `getCorners`, `getAabb`
- **UV conversion**: `uvToWorld`, `worldToUv`, `getUvToWorldMatrix`
- **Tests**: `containsPoint`, `intersectsAabb`
- **Mutation**: `setCenter`, `translate`, `scaleBy`, `scaleAround`, `rotateAround`, `boundPoints`

### Aabb

Axis-aligned bounding box as tuple `[left, top, right, bottom]`.

- **Creation**: `create`, `zero`, `clone`, `fromPoints`, `fromPositionSize`
- **Getters**: `left`, `top`, `right`, `bottom`, `width`, `height`, `center`, `size`, `corners`
- **Tests**: `containsPoint`, `contains`, `intersects`, `distanceToPoint`
- **Mutation**: `set`, `copy`, `expand`, `union`, `intersection`, `pad`, `setFromPoints`, `translate`, `scale`

### Mat2

2x3 affine transformation matrix `[a, b, c, d, tx, ty]` (compatible with CSS `matrix()`).

- **Creation**: `create`, `identity`, `clone`, `fromTranslation`, `fromScale`, `fromRotation`, `fromSkew`, `fromCssMatrix`
- **Getters**: `getTranslation`, `getScale`, `getRotation`, `determinant`
- **Mutation**: `set`, `copy`, `setIdentity`, `multiply`, `premultiply`, `invert`, `translate`, `scale`, `rotate`, `skew`
- **Transform**: `transformPoint`, `transformVector`, `inverseTransformPoint`
- **Utility**: `equals`, `isIdentity`, `toCssMatrix`

### Arc

Arc (curved line through 3 points) as tuple `[aX, aY, bX, bY, cX, cY, thickness]`.

- **Creation**: `create`, `zero`, `clone`
- **Getters**: `a`, `b`, `c`, `thickness`
- **Computed**: `isCollinear`, `computeCenter`, `compute` (returns `ArcComputed` with center, radius, angles)
- **Tests**: `containsPoint`, `intersectsAabb`, `intersectsCapsule`, `inArcAngle`
- **Intersection**: `intersectSegment`, `intersectRect`
- **Parametric**: `pointToParametric`, `parametricToPoint`, `length`, `directionAt`
- **Bounds**: `extremaPoints`, `getExtrema`
- **Mutation**: `set`, `copy`, `setA`, `setB`, `setC`, `setThickness`, `setFromPoints`, `trim`

### Capsule

Capsule (stadium shape) as tuple `[ax, ay, bx, by, radius]`. Used for swept collision detection.

- **Creation**: `create`, `fromPoints`, `clone`
- **Getters**: `pointA`, `pointB`, `radius`, `center`, `length`, `bounds`, `getExtrema`
- **Collision**: `closestPointOnSegmentParam`, `closestPointOnCenterLine`, `distanceToPoint`, `containsPoint`, `intersectsAabb`, `intersectsCapsule`, `segmentToSegmentDistance`
- **Mutation**: `set`, `copy`, `translate`, `trim`

### Ray

Ray as tuple `[originX, originY, directionX, directionY]`.

- **Creation**: `create`, `fromPoints`, `zero`, `clone`
- **Getters**: `origin`, `direction`, `pointAt`
- **Intersection**: `intersectSegment`, `intersectAabb`, `intersectRect` (returns `RayIntersection` with point and distance)
- **Mutation**: `set`, `copy`, `setOrigin`, `setDirection`

### Scalar

Scalar math utilities:

- `clamp`, `lerp`
- `normalizeAngle`, `normalizeAngleSigned`, `anglesApproxEqual`, `approxEqual`
- Constant: `TAU` (2π)

## License

MIT
