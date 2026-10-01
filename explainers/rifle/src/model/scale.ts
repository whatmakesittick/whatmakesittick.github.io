export type Extent = readonly [min: number, max: number];

export type Point = readonly [x: number, y: number, z: number];

export interface Box {
  x: Extent;
  y: Extent;
  z: Extent;
}
