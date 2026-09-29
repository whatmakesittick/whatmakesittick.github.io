export const UNITS_PER_MM = 1;

export function mm(millimetres: number): number {
  return millimetres * UNITS_PER_MM;
}

export function cm(centimetres: number): number {
  return mm(centimetres * 10);
}

export type Extent = readonly [min: number, max: number];

export type Point = readonly [x: number, y: number, z: number];

export interface Box {
  x: Extent;
  y: Extent;
  z: Extent;
}

export const LEFT: Point = [1, 0, 0];
export const UP: Point = [0, 1, 0];
export const FRONT: Point = [0, 0, 1];

export const CUT_PLANE_Z = 0;

export function cutawayKeeps(z: number): boolean {
  return z <= CUT_PLANE_Z;
}

export const HEART_EXTENT: Box = { x: [-62, 62], y: [-92, 62], z: [-42, 42] };

export const SCENE_EXTENT: Box = { x: [-80, 80], y: [-100, 130], z: [-60, 50] };

export function contains(box: Box, point: Point): boolean {
  const [x, y, z] = point;
  return (
    x >= box.x[0] &&
    x <= box.x[1] &&
    y >= box.y[0] &&
    y <= box.y[1] &&
    z >= box.z[0] &&
    z <= box.z[1]
  );
}

export function union(boxes: readonly Box[]): Box {
  const axis = (pick: (box: Box) => Extent): Extent => [
    Math.min(...boxes.map((box) => pick(box)[0])),
    Math.max(...boxes.map((box) => pick(box)[1])),
  ];
  return { x: axis((box) => box.x), y: axis((box) => box.y), z: axis((box) => box.z) };
}

export function pad(box: Box, margin: number): Box {
  return {
    x: [box.x[0] - margin, box.x[1] + margin],
    y: [box.y[0] - margin, box.y[1] + margin],
    z: [box.z[0] - margin, box.z[1] + margin],
  };
}
