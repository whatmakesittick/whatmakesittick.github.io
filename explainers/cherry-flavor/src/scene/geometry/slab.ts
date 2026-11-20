import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2 } from 'three';

export const SLAB_GROUPS = { cap: 0, inner: 1, outer: 2 } as const;

export interface SlabOutline {
  readonly points: readonly Vector2[];
  readonly outer: readonly boolean[];
}

const XYZ = 3;

function outwardNormals(points: readonly Vector2[]): Vector2[] {
  const count = points.length;
  return points.map((_, index) => {
    const before = points[(index - 1 + count) % count];
    const after = points[(index + 1) % count];
    return new Vector2(after.y - before.y, before.x - after.x).normalize();
  });
}

function capTriangles(points: readonly Vector2[]): number[] {
  return ShapeUtils.triangulateShape([...points], []).flatMap(([a, b, c]) => {
    const area = ShapeUtils.area([points[a], points[b], points[c]]);
    return area >= 0 ? [a, b, c] : [a, c, b];
  });
}

export function slabGeometry(outline: SlabOutline, depth: number): BufferGeometry {
  const { points, outer } = outline;
  const count = points.length;
  const normals2 = outwardNormals(points);
  const positions: number[] = [];
  const normals: number[] = [];
  points.forEach((point) => {
    positions.push(point.x, point.y, 0);
    normals.push(0, 0, 1);
  });
  points.forEach((point, index) => {
    const normal = normals2[index];
    positions.push(point.x, point.y, 0, point.x, point.y, -depth);
    normals.push(normal.x, normal.y, 0, normal.x, normal.y, 0);
  });
  const cap = capTriangles(points);
  const walls: Record<'inner' | 'outer', number[]> = { inner: [], outer: [] };
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    const front = count + index * 2;
    const back = front + 1;
    const nextFront = count + next * 2;
    const nextBack = nextFront + 1;
    walls[outer[index] ? 'outer' : 'inner'].push(front, back, nextFront, nextFront, back, nextBack);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), XYZ));
  geometry.setIndex([...cap, ...walls.inner, ...walls.outer]);
  geometry.addGroup(0, cap.length, SLAB_GROUPS.cap);
  geometry.addGroup(cap.length, walls.inner.length, SLAB_GROUPS.inner);
  geometry.addGroup(cap.length + walls.inner.length, walls.outer.length, SLAB_GROUPS.outer);
  return geometry;
}
