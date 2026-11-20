import { SLOT_IDS } from '../../explainers/freestyle-swim/src/scene/parts/swimmer/skin/types.ts';
import type { HalfMesh } from './encode.ts';
import { triangleArea } from './topology.ts';

const DEGENERATE_AREA = 1e-9;

export function surfaceReport(mesh: HalfMesh): {
  openEdges: number;
  degenerate: number;
  nonManifold: number;
} {
  const edgeCount = new Map<string, number>();
  let degenerate = 0;
  for (const slot of SLOT_IDS) {
    const indices = mesh.slots[slot];
    for (let i = 0; i < indices.length; i += 3) {
      const corners = [indices[i], indices[i + 1], indices[i + 2]];
      if (triangleArea(mesh.positions, corners[0], corners[1], corners[2]) < DEGENERATE_AREA)
        degenerate++;
      for (let k = 0; k < 3; k++) {
        const [a, b] = [corners[k], corners[(k + 1) % 3]];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
  }
  let openEdges = 0;
  let nonManifold = 0;
  for (const [key, count] of edgeCount) {
    const onMidline = key.split(',').every((v) => mesh.positions[Number(v) * 3 + 2] === 0);
    if (count > 2) nonManifold++;
    else if (count === 1 && !onMidline) openEdges++;
    else if (count === 2 && onMidline) openEdges++;
  }
  return { openEdges, degenerate, nonManifold };
}

export function midlineFolds(
  slots: Readonly<Record<string, ArrayLike<number>>>,
  positions: ArrayLike<number>,
): number[][] {
  const edges = new Map<string, number>();
  for (const indices of Object.values(slots)) {
    for (let i = 0; i < indices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const [a, b] = [indices[i + k], indices[i + ((k + 1) % 3)]];
        if (positions[a * 3 + 2] !== 0 || positions[b * 3 + 2] !== 0) continue;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
  }
  return [...edges].filter(([, count]) => count > 1).map(([key]) => key.split(',').map(Number));
}
