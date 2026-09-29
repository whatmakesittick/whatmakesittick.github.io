const XYZ = 3;
const CORNERS = 3;

export interface SheetBuffers {
  readonly positions: ArrayLike<number>;
  readonly normals: ArrayLike<number>;
  readonly index: ArrayLike<number>;
}

export interface ClipTarget {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
}

interface Corner {
  position: [number, number, number];
  normal: [number, number, number];
}

function corner(sheet: SheetBuffers, vertex: number): Corner {
  const offset = vertex * XYZ;
  return {
    position: [sheet.positions[offset], sheet.positions[offset + 1], sheet.positions[offset + 2]],
    normal: [sheet.normals[offset], sheet.normals[offset + 1], sheet.normals[offset + 2]],
  };
}

function between(a: Corner, b: Corner, share: number): Corner {
  const mix = (from: readonly number[], to: readonly number[]): [number, number, number] => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share,
    from[2] + (to[2] - from[2]) * share,
  ];
  return { position: mix(a.position, b.position), normal: mix(a.normal, b.normal) };
}

function behindPlane(polygon: readonly Corner[], planeZ: number): Corner[] {
  const kept: Corner[] = [];
  polygon.forEach((current, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const currentIn = current.position[2] <= planeZ;
    const nextIn = next.position[2] <= planeZ;
    if (currentIn) kept.push(current);
    if (currentIn !== nextIn) {
      const share = (planeZ - current.position[2]) / (next.position[2] - current.position[2]);
      kept.push(between(current, next, share));
    }
  });
  return kept;
}

function write(target: ClipTarget, slot: number, point: Corner): void {
  target.positions.set(point.position, slot * XYZ);
  target.normals.set(point.normal, slot * XYZ);
}

export function clipSheet(sheet: SheetBuffers, planeZ: number | null, target: ClipTarget): number {
  let written = 0;
  for (let t = 0; t < sheet.index.length; t += CORNERS) {
    const triangle = [0, 1, 2].map((slot) => corner(sheet, sheet.index[t + slot]));
    const polygon = planeZ === null ? triangle : behindPlane(triangle, planeZ);
    for (let fan = 1; fan < polygon.length - 1; fan += 1) {
      write(target, written, polygon[0]);
      write(target, written + 1, polygon[fan]);
      write(target, written + 2, polygon[fan + 1]);
      written += CORNERS;
    }
  }
  return written;
}

export function clipCapacity(indexCount: number): number {
  return indexCount * 2;
}
