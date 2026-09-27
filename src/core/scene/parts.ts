import { Object3D } from 'three';

export function anchorAt(parent: Object3D, x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  parent.add(anchor);
  return anchor;
}

export function isShown(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}
