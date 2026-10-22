import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';
import { JOINT } from './constants';
import { emitGrid, gridNormals, shares } from './grid';
import { MeshBuilder } from './mesh';
import type { Vec3 } from './nose';
import { CONTOUR } from './profile';

const REACH_INTO_SECTION = 0.04;

export function bellowsInset(share: number): number {
  const fold = 0.5 - 0.5 * Math.cos(FULL_TURN * JOINT.bellowsFolds * share);
  return JOINT.bellowsInset + JOINT.bellowsDepth * fold;
}

export function buildBellows(boundaries: readonly number[]): BufferGeometry {
  const builder = new MeshBuilder();
  const reach = JOINT.halfGap + REACH_INTO_SECTION;
  const steps = JOINT.bellowsFolds * JOINT.bellowsStationsPerFold;
  boundaries.forEach((boundary, index) => {
    const points = shares(steps).map((share) => {
      const x = boundary - reach + 2 * reach * share;
      const inset = bellowsInset(share);
      return CONTOUR.rows.map((row): Vec3 => [x, row.y - row.ny * inset, row.z - row.nz * inset]);
    });
    const normals = gridNormals(points, () => [0, 1, 0]);
    emitGrid(() => builder, points, normals, `joint${index}`);
  });
  return builder.build();
}
