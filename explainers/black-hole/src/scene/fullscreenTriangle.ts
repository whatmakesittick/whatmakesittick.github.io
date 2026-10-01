import { BufferAttribute, BufferGeometry } from 'three';

const CORNERS = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
const COMPONENTS = 3;

export function fullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(CORNERS, COMPONENTS));
  return geometry;
}
