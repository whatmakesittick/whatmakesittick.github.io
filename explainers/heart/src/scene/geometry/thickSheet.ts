import { Vector3 } from 'three';

export interface SheetGrid {
  readonly start: number;
  readonly columns: number;
  readonly rows: number;
}

export type Edge = readonly [from: number, to: number];

export interface ThickLayout {
  readonly sheetVertices: number;
  readonly rimEdges: readonly Edge[];
  readonly vertexCount: number;
  readonly index: readonly number[];
}

const XYZ = 3;
const RIM_CORNERS = 4;

function gridVertex(grid: SheetGrid, column: number, row: number): number {
  return grid.start + column * (grid.rows + 1) + row;
}

export function openRim(grid: SheetGrid): Edge[] {
  const edges: Edge[] = [];
  for (let column = 0; column < grid.columns; column += 1) {
    edges.push([gridVertex(grid, column + 1, grid.rows), gridVertex(grid, column, grid.rows)]);
  }
  for (let row = 0; row < grid.rows; row += 1) {
    edges.push([gridVertex(grid, 0, row + 1), gridVertex(grid, 0, row)]);
    edges.push([gridVertex(grid, grid.columns, row), gridVertex(grid, grid.columns, row + 1)]);
  }
  return edges;
}

export function thickLayout(
  sheetIndex: ArrayLike<number>,
  sheetVertices: number,
  rimEdges: readonly Edge[],
): ThickLayout {
  const index: number[] = [];
  for (let t = 0; t < sheetIndex.length; t += 3) {
    const [a, b, c] = [sheetIndex[t], sheetIndex[t + 1], sheetIndex[t + 2]];
    index.push(a, b, c);
    index.push(a + sheetVertices, c + sheetVertices, b + sheetVertices);
  }
  const rimStart = sheetVertices * 2;
  rimEdges.forEach((_, edge) => {
    const base = rimStart + edge * RIM_CORNERS;
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { sheetVertices, rimEdges, vertexCount: rimStart + rimEdges.length * RIM_CORNERS, index };
}

export function thicken(
  layout: ThickLayout,
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  halfThickness: number,
  outPositions: Float32Array,
  outNormals: Float32Array,
): void {
  const count = layout.sheetVertices;
  for (let vertex = 0; vertex < count; vertex += 1) {
    for (let axis = 0; axis < XYZ; axis += 1) {
      const offset = vertex * XYZ + axis;
      const normal = normals[offset];
      outPositions[offset] = positions[offset] + normal * halfThickness;
      outNormals[offset] = normal;
      outPositions[offset + count * XYZ] = positions[offset] - normal * halfThickness;
      outNormals[offset + count * XYZ] = -normal;
    }
  }
  const along = new Vector3();
  const normal = new Vector3();
  const outward = new Vector3();
  const rimStart = count * 2;
  layout.rimEdges.forEach(([from, to], edge) => {
    along.set(
      positions[to * XYZ] - positions[from * XYZ],
      positions[to * XYZ + 1] - positions[from * XYZ + 1],
      positions[to * XYZ + 2] - positions[from * XYZ + 2],
    );
    normal.set(normals[from * XYZ], normals[from * XYZ + 1], normals[from * XYZ + 2]);
    outward.crossVectors(along, normal).normalize();
    const corners = [
      [from, halfThickness],
      [to, halfThickness],
      [to, -halfThickness],
      [from, -halfThickness],
    ] as const;
    corners.forEach(([vertex, side], corner) => {
      const slot = (rimStart + edge * RIM_CORNERS + corner) * XYZ;
      for (let axis = 0; axis < XYZ; axis += 1) {
        outPositions[slot + axis] =
          positions[vertex * XYZ + axis] + normals[vertex * XYZ + axis] * side;
      }
      outNormals[slot] = outward.x;
      outNormals[slot + 1] = outward.y;
      outNormals[slot + 2] = outward.z;
    });
  });
}
