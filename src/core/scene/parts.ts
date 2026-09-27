import { Object3D } from 'three';

export function anchorAt(parent: Object3D, x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  parent.add(anchor);
  return anchor;
}
