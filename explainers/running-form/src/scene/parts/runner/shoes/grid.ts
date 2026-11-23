import { BufferAttribute, BufferGeometry } from 'three';

const AXES = 3;
const WELD_GRID = 1e5;

export interface Grid {
  readonly positions: number[];
  readonly fields: number[];
  readonly stations: number;
  readonly ringSize: number;
}

export interface FaceGroup {
  readonly material: number;
  readonly indices: number[];
}

export function vertexAt(grid: Grid, station: number, ring: number): number {
  return station * grid.ringSize + (ring % grid.ringSize);
}

export function pushQuad(
  grid: Grid,
  out: number[],
  station: number,
  ring: number,
  flip: boolean,
): void {
  const a = vertexAt(grid, station, ring);
  const b = vertexAt(grid, station + 1, ring);
  const c = vertexAt(grid, station, ring + 1);
  const d = vertexAt(grid, station + 1, ring + 1);
  if (flip) out.push(a, c, b, b, c, d);
  else out.push(a, b, c, b, d, c);
}

export function clusteredStations(from: number, to: number, count: number): number[] {
  return Array.from({ length: count }, (_, at) => {
    const t = at / (count - 1);
    const eased = (1 - Math.cos(Math.PI * t)) / 2;
    return from + (to - from) * (0.35 * t + 0.65 * eased);
  });
}

function weldNormals(geometry: BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const groups = new Map<string, number[]>();
  for (let v = 0; v < position.count; v++) {
    const key = [position.getX(v), position.getY(v), position.getZ(v)]
      .map((value) => Math.round(value * WELD_GRID))
      .join(',');
    const group = groups.get(key);
    if (group) group.push(v);
    else groups.set(key, [v]);
  }
  groups.forEach((vertices) => {
    if (vertices.length < 2) return;
    let x = 0;
    let y = 0;
    let z = 0;
    vertices.forEach((v) => {
      x += normal.getX(v);
      y += normal.getY(v);
      z += normal.getZ(v);
    });
    const length = Math.hypot(x, y, z) || 1;
    vertices.forEach((v) => normal.setXYZ(v, x / length, y / length, z / length));
  });
}

export function gridGeometry(
  grid: Grid,
  groups: readonly FaceGroup[],
  fieldName?: string,
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(Float32Array.from(grid.positions), AXES));
  if (fieldName) {
    geometry.setAttribute(fieldName, new BufferAttribute(Float32Array.from(grid.fields), 4));
  }
  const indices: number[] = [];
  groups.forEach((group) => {
    geometry.addGroup(indices.length, group.indices.length, group.material);
    indices.push(...group.indices);
  });
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldNormals(geometry);
  return geometry;
}

export function mirrorGeometry(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let v = 0; v < position.count; v++) {
    position.setZ(v, -position.getZ(v));
    normal.setZ(v, -normal.getZ(v));
  }
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += AXES) {
      const second = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, second);
    }
  }
  return geometry;
}
