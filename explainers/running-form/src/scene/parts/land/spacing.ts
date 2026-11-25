import type { BufferGeometry } from 'three';

export const LONG_SEGMENTS = 96;
export const DEPTH_SEGMENTS = 16;

const AXES = { x: 0, z: 2 } as const;
const GROWTH = 5;

type Axis = keyof typeof AXES;

function grow(share: number): number {
  return Math.expm1(GROWTH * share) / Math.expm1(GROWTH);
}

function remap(
  geometry: BufferGeometry,
  axis: Axis,
  map: (value: number) => number,
): BufferGeometry {
  const position = geometry.getAttribute('position');
  const component = AXES[axis];
  for (let v = 0; v < position.count; v++) {
    position.setComponent(v, component, map(position.getComponent(v, component)));
  }
  position.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function denseNearOrigin(
  geometry: BufferGeometry,
  axis: Axis,
  half: number,
): BufferGeometry {
  return remap(geometry, axis, (value) => Math.sign(value) * half * grow(Math.abs(value) / half));
}

export function denseNearEdge(
  geometry: BufferGeometry,
  axis: Axis,
  near: number,
  far: number,
): BufferGeometry {
  return remap(
    geometry,
    axis,
    (value) => near + (far - near) * grow((value - near) / (far - near)),
  );
}
