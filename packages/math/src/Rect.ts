import { Vec2 } from "./Vec2";
import type { Aabb } from "./Aabb";

/**
 * A rectangle defined by position [x, y] and size [width, height].
 * Unlike Aabb which stores [left, top, right, bottom], Rect works with
 * the position/size representation commonly used in UI components.
 *
 * Rect operations support optional rotation around the center.
 */

// Tuple indices
const X = 0;
const Y = 1;

export namespace Rect {
  // ============================================
  // Output methods (write to out parameter)
  // ============================================

  /**
   * Get the center point of a rectangle.
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param out - Output vector to write to
   */
  export const getCenter = (position: Vec2, size: Vec2, out: Vec2): void => {
    out[X] = position[X] + size[X] / 2;
    out[Y] = position[Y] + size[Y] / 2;
  };

  /**
   * Get the four corner points of a rectangle (accounting for rotation).
   * Returns corners in order: top-left, top-right, bottom-right, bottom-left.
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param out - Output array of 4 Vec2 to write to
   */
  export const getCorners = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    out: [Vec2, Vec2, Vec2, Vec2]
  ): void => {
    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const cx = position[X] + halfWidth;
    const cy = position[Y] + halfHeight;

    const cos = Math.cos(rotateZ);
    const sin = Math.sin(rotateZ);

    // TL
    out[0][X] = cx + -halfWidth * cos - -halfHeight * sin;
    out[0][Y] = cy + -halfWidth * sin + -halfHeight * cos;
    // TR
    out[1][X] = cx + halfWidth * cos - -halfHeight * sin;
    out[1][Y] = cy + halfWidth * sin + -halfHeight * cos;
    // BR
    out[2][X] = cx + halfWidth * cos - halfHeight * sin;
    out[2][Y] = cy + halfWidth * sin + halfHeight * cos;
    // BL
    out[3][X] = cx + -halfWidth * cos - halfHeight * sin;
    out[3][Y] = cy + -halfWidth * sin + halfHeight * cos;
  };

  /**
   * Compute the axis-aligned bounding box of a rotated rectangle.
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param out - Output AABB [left, top, right, bottom]
   */
  export const getAabb = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    out: Aabb
  ): void => {
    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const cx = position[X] + halfWidth;
    const cy = position[Y] + halfHeight;

    const cos = Math.cos(rotateZ);
    const sin = Math.sin(rotateZ);

    // Compute all 4 corners
    const tlX = cx + -halfWidth * cos - -halfHeight * sin;
    const tlY = cy + -halfWidth * sin + -halfHeight * cos;
    const trX = cx + halfWidth * cos - -halfHeight * sin;
    const trY = cy + halfWidth * sin + -halfHeight * cos;
    const brX = cx + halfWidth * cos - halfHeight * sin;
    const brY = cy + halfWidth * sin + halfHeight * cos;
    const blX = cx + -halfWidth * cos - halfHeight * sin;
    const blY = cy + -halfWidth * sin + halfHeight * cos;

    // Find min/max
    out[0] = Math.min(tlX, trX, brX, blX); // left
    out[1] = Math.min(tlY, trY, brY, blY); // top
    out[2] = Math.max(tlX, trX, brX, blX); // right
    out[3] = Math.max(tlY, trY, brY, blY); // bottom
  };

  // ============================================
  // UV coordinate conversions
  // ============================================

  /**
   * Convert UV coordinates (0-1) to world coordinates.
   * UV (0,0) is top-left, (1,1) is bottom-right of the unrotated rectangle.
   * Accounts for rotation around center.
   *
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param uv - UV coordinates [u, v] where 0-1 maps to rectangle bounds
   * @returns World coordinates [x, y]
   */
  export const uvToWorld = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    uv: Vec2
  ): Vec2 => {
    // Convert UV to local coordinates (relative to center)
    const result: Vec2 = [(uv[X] - 0.5) * size[X], (uv[Y] - 0.5) * size[Y]];

    // Rotate and translate to world center
    Vec2.rotate(result, rotateZ);
    const center: Vec2 = [0, 0];
    getCenter(position, size, center);
    Vec2.add(result, center);

    return result;
  };

  /**
   * Convert world coordinates to UV coordinates (0-1).
   * Accounts for rotation around center.
   *
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param world - World coordinates [x, y]
   * @returns UV coordinates [u, v] where 0-1 maps to rectangle bounds
   */
  export const worldToUv = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    world: Vec2
  ): Vec2 => {
    // Translate relative to center
    const center: Vec2 = [0, 0];
    getCenter(position, size, center);
    const result: Vec2 = Vec2.clone(world);
    Vec2.sub(result, center);

    // Rotate by inverse to get local coordinates, divide by size, offset to UV
    Vec2.rotate(result, -rotateZ);
    Vec2.divide(result, size);
    Vec2.addScalar(result, 0.5);

    return result;
  };

  // ============================================
  // Tests (non-mutating, return boolean)
  // ============================================

  /**
   * Check if a point is contained within a rectangle (accounting for rotation).
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param point - Point to test [x, y]
   */
  export const containsPoint = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    point: Vec2
  ): boolean => {
    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const cx = position[X] + halfWidth;
    const cy = position[Y] + halfHeight;

    // Translate point relative to center
    const dx = point[X] - cx;
    const dy = point[Y] - cy;

    // Rotate point in opposite direction to get local coordinates
    const cos = Math.cos(-rotateZ);
    const sin = Math.sin(-rotateZ);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return (
      localX >= -halfWidth &&
      localX <= halfWidth &&
      localY >= -halfHeight &&
      localY <= halfHeight
    );
  };

  /**
   * Check if an AABB intersects with a rectangle using Separating Axis Theorem.
   * This handles all intersection cases including narrow AABBs that pass through
   * the middle of a rotated rectangle without touching any corners.
   *
   * @param position - Rectangle position [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param aabb - AABB to test [left, top, right, bottom]
   * @param tempCorners - Pre-allocated corners array for rectangle (avoids allocation)
   * @param tempAabbCorners - Pre-allocated corners array for AABB (avoids allocation)
   * @param tempAxes - Pre-allocated axes array (avoids allocation)
   */
  export const intersectsAabb = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    aabb: Aabb,
    tempCorners: [Vec2, Vec2, Vec2, Vec2],
    tempAabbCorners: [Vec2, Vec2, Vec2, Vec2],
    tempAxes: [Vec2, Vec2]
  ): boolean => {
    const halfWidth = size[X] / 2;
    const halfHeight = size[Y] / 2;
    const cx = position[X] + halfWidth;
    const cy = position[Y] + halfHeight;

    const cos = Math.cos(rotateZ);
    const sin = Math.sin(rotateZ);

    // Fill AABB corners [left, top, right, bottom]
    tempAabbCorners[0][X] = aabb[0];
    tempAabbCorners[0][Y] = aabb[1]; // top-left
    tempAabbCorners[1][X] = aabb[2];
    tempAabbCorners[1][Y] = aabb[1]; // top-right
    tempAabbCorners[2][X] = aabb[2];
    tempAabbCorners[2][Y] = aabb[3]; // bottom-right
    tempAabbCorners[3][X] = aabb[0];
    tempAabbCorners[3][Y] = aabb[3]; // bottom-left

    // Fill rectangle corners (rotated)
    // TL
    tempCorners[0][X] = cx + -halfWidth * cos - -halfHeight * sin;
    tempCorners[0][Y] = cy + -halfWidth * sin + -halfHeight * cos;
    // TR
    tempCorners[1][X] = cx + halfWidth * cos - -halfHeight * sin;
    tempCorners[1][Y] = cy + halfWidth * sin + -halfHeight * cos;
    // BR
    tempCorners[2][X] = cx + halfWidth * cos - halfHeight * sin;
    tempCorners[2][Y] = cy + halfWidth * sin + halfHeight * cos;
    // BL
    tempCorners[3][X] = cx + -halfWidth * cos - halfHeight * sin;
    tempCorners[3][Y] = cy + -halfWidth * sin + halfHeight * cos;

    // Compute rectangle edge normals (only need 2 unique axes for a rectangle)
    const edge0X = tempCorners[1][X] - tempCorners[0][X];
    const edge0Y = tempCorners[1][Y] - tempCorners[0][Y];
    const len0 = Math.sqrt(edge0X * edge0X + edge0Y * edge0Y);
    if (len0 > 0) {
      tempAxes[0][X] = -edge0Y / len0;
      tempAxes[0][Y] = edge0X / len0;
    }

    const edge1X = tempCorners[2][X] - tempCorners[1][X];
    const edge1Y = tempCorners[2][Y] - tempCorners[1][Y];
    const len1 = Math.sqrt(edge1X * edge1X + edge1Y * edge1Y);
    if (len1 > 0) {
      tempAxes[1][X] = -edge1Y / len1;
      tempAxes[1][Y] = edge1X / len1;
    }

    // Test X axis (AABB axis)
    if (isSeparated(tempAabbCorners, tempCorners, 1, 0)) return false;

    // Test Y axis (AABB axis)
    if (isSeparated(tempAabbCorners, tempCorners, 0, 1)) return false;

    // Test rectangle axes
    if (
      isSeparated(tempAabbCorners, tempCorners, tempAxes[0][X], tempAxes[0][Y])
    )
      return false;
    if (
      isSeparated(tempAabbCorners, tempCorners, tempAxes[1][X], tempAxes[1][Y])
    )
      return false;

    return true; // No separating axis found, shapes intersect
  };

  // ============================================
  // Mutations (modify position/size in-place)
  // ============================================

  /**
   * Set the center point of a rectangle (adjusts position accordingly).
   * @param position - Rectangle position to modify [x, y]
   * @param size - Rectangle size [width, height]
   * @param center - New center point [x, y]
   */
  export const setCenter = (position: Vec2, size: Vec2, center: Vec2): void => {
    position[X] = center[X] - size[X] / 2;
    position[Y] = center[Y] - size[Y] / 2;
  };

  /**
   * Translate a rectangle by a delta offset.
   * @param position - Rectangle position to modify [x, y]
   * @param delta - Translation delta [dx, dy]
   */
  export const translate = (position: Vec2, delta: Vec2): void => {
    position[X] += delta[X];
    position[Y] += delta[Y];
  };

  /**
   * Scale a rectangle uniformly around its center.
   * @param position - Rectangle position to modify [x, y]
   * @param size - Rectangle size to modify [width, height]
   * @param scaleFactor - Scale multiplier
   */
  export const scaleBy = (
    position: Vec2,
    size: Vec2,
    scaleFactor: number
  ): void => {
    // Get current center
    const cx = position[X] + size[X] / 2;
    const cy = position[Y] + size[Y] / 2;

    // Scale size
    size[X] *= scaleFactor;
    size[Y] *= scaleFactor;

    // Reposition to maintain center
    position[X] = cx - size[X] / 2;
    position[Y] = cy - size[Y] / 2;
  };

  /**
   * Scale a rectangle around a pivot point.
   * @param position - Rectangle position to modify [x, y]
   * @param size - Rectangle size to modify [width, height]
   * @param pivot - Pivot point [x, y]
   * @param scaleFactor - Scale multiplier
   */
  export const scaleAround = (
    position: Vec2,
    size: Vec2,
    pivot: Vec2,
    scaleFactor: number
  ): void => {
    // Get current center
    const cx = position[X] + size[X] / 2;
    const cy = position[Y] + size[Y] / 2;

    // Scale center position relative to pivot
    const newCx = pivot[X] + (cx - pivot[X]) * scaleFactor;
    const newCy = pivot[Y] + (cy - pivot[Y]) * scaleFactor;

    // Scale size
    size[X] *= scaleFactor;
    size[Y] *= scaleFactor;

    // Reposition based on new center
    position[X] = newCx - size[X] / 2;
    position[Y] = newCy - size[Y] / 2;
  };

  /**
   * Rotate a rectangle around a pivot point (updates position and rotation).
   * @param position - Rectangle position to modify [x, y]
   * @param size - Rectangle size [width, height]
   * @param rotateZ - Current rotation (will be modified indirectly via return)
   * @param pivot - Pivot point [x, y]
   * @param angle - Angle to rotate by in radians
   * @returns The new rotation value (rotateZ + angle)
   */
  export const rotateAround = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    pivot: Vec2,
    angle: number
  ): number => {
    // Get current center
    const cx = position[X] + size[X] / 2;
    const cy = position[Y] + size[Y] / 2;

    // Rotate center around pivot
    const dx = cx - pivot[X];
    const dy = cy - pivot[Y];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newCx = pivot[X] + dx * cos - dy * sin;
    const newCy = pivot[Y] + dx * sin + dy * cos;

    // Update position based on new center
    position[X] = newCx - size[X] / 2;
    position[Y] = newCy - size[Y] / 2;

    // Return new rotation
    return rotateZ + angle;
  };

  /**
   * Update position and size so that the rectangle bounds the given points,
   * accounting for rotation. Points are transformed into the rectangle's
   * local coordinate space (inverse rotation), bounded, then the center
   * is transformed back to world space.
   *
   * @param position - Rectangle position to modify [x, y]
   * @param size - Rectangle size to modify [width, height]
   * @param rotateZ - Rotation around center in radians
   * @param points - Array of points to bound [x, y][]
   */
  export const boundPoints = (
    position: Vec2,
    size: Vec2,
    rotateZ: number,
    points: Vec2[]
  ): void => {
    if (points.length === 0) return;

    // Fast path: no rotation, just compute AABB directly
    if (rotateZ === 0) {
      let minX = points[0][X];
      let minY = points[0][Y];
      let maxX = minX;
      let maxY = minY;

      for (let i = 1; i < points.length; i++) {
        const px = points[i][X];
        const py = points[i][Y];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }

      position[X] = minX;
      position[Y] = minY;
      size[X] = maxX - minX;
      size[Y] = maxY - minY;
      return;
    }

    // Rotate all points by -rotateZ to get them in local space
    const cos = Math.cos(-rotateZ);
    const sin = Math.sin(-rotateZ);

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const point of points) {
      // Rotate point around origin by -rotateZ
      const localX = point[X] * cos - point[Y] * sin;
      const localY = point[X] * sin + point[Y] * cos;

      if (localX < minX) minX = localX;
      if (localY < minY) minY = localY;
      if (localX > maxX) maxX = localX;
      if (localY > maxY) maxY = localY;
    }

    // Compute center and size in local space
    const localCenterX = (minX + maxX) / 2;
    const localCenterY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;

    // Rotate center back to world space
    const cosInv = Math.cos(rotateZ);
    const sinInv = Math.sin(rotateZ);
    const worldCenterX = localCenterX * cosInv - localCenterY * sinInv;
    const worldCenterY = localCenterX * sinInv + localCenterY * cosInv;

    // Set position based on world center minus half size
    position[X] = worldCenterX - width / 2;
    position[Y] = worldCenterY - height / 2;
    size[X] = width;
    size[Y] = height;
  };
}

/**
 * Check if two sets of corners are separated along an axis.
 * Returns true if separated (no intersection), false if overlapping.
 */
function isSeparated(
  cornersA: [Vec2, Vec2, Vec2, Vec2],
  cornersB: [Vec2, Vec2, Vec2, Vec2],
  axisX: number,
  axisY: number
): boolean {
  let minA = Number.POSITIVE_INFINITY;
  let maxA = Number.NEGATIVE_INFINITY;
  let minB = Number.POSITIVE_INFINITY;
  let maxB = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < 4; i++) {
    const projA = cornersA[i][0] * axisX + cornersA[i][1] * axisY;
    if (projA < minA) minA = projA;
    if (projA > maxA) maxA = projA;

    const projB = cornersB[i][0] * axisX + cornersB[i][1] * axisY;
    if (projB < minB) minB = projB;
    if (projB > maxB) maxB = projB;
  }

  return maxA < minB || maxB < minA;
}
