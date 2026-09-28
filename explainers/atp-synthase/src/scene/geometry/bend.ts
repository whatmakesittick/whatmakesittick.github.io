import type { BufferGeometry } from 'three';

const SLOPE_FACTOR = 2;

export function bendEndsInward(
  geometry: BufferGeometry,
  halfHeight: number,
  bend: number,
): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const y = position.getY(vertex);
    const share = y / halfHeight;
    position.setX(vertex, position.getX(vertex) - bend * share * share);
    const slope = (SLOPE_FACTOR * bend * y) / (halfHeight * halfHeight);
    const nx = normal.getX(vertex);
    const ny = normal.getY(vertex) + slope * nx;
    const nz = normal.getZ(vertex);
    const length = Math.hypot(nx, ny, nz);
    normal.setXYZ(vertex, nx / length, ny / length, nz / length);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}
