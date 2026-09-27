import { Box3, Vector3 } from 'three';
import type { Matrix4 } from 'three';

export type Extent = readonly [min: number, max: number];

export interface RegionSpec {
  x: Extent;
  y: Extent;
  z: Extent;
}

export function regionFromSpec({ x, y, z }: RegionSpec): Box3 {
  return new Box3(new Vector3(x[0], y[0], z[0]), new Vector3(x[1], y[1], z[1]));
}

export function localRegions<R extends string>(
  specs: Readonly<Record<R, RegionSpec>>,
): (id: R, rootMatrix?: Matrix4) => Box3 {
  return (id, rootMatrix) => {
    const box = regionFromSpec(specs[id]);
    return rootMatrix ? box.applyMatrix4(rootMatrix) : box;
  };
}
