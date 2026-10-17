import type { BufferGeometry } from 'three';
import type { Extent } from '@core/scene/regions';
import { SITE } from '../../../model/layout';
import { arrayGeometry, upNormals } from './arrays';
import { groundTint } from './scrub';

export const GROUND = {
  level: -0.04,
  centreX: (SITE.run.x[0] + SITE.run.x[1]) / 2,
  step: 15,
  verge: [2, 5, 9],
  skirt: [150, 400, 900],
} as const;

export function gridLines(extent: Extent, step: number, extras: readonly number[]): number[] {
  const lines = new Set<number>(extras);
  for (let line = extent[0]; line < extent[1]; line += step) lines.add(line);
  lines.add(extent[1]);
  return [...lines].sort((a, b) => a - b);
}

function axisLines(centre: number, edges: Extent): number[] {
  const half = SITE.groundSize / 2;
  const extent: Extent = [centre - half, centre + half];
  const verge = GROUND.verge.flatMap((reach) => [edges[0] - reach, edges[1] + reach]);
  const skirt = GROUND.skirt.flatMap((reach) => [extent[0] - reach, extent[1] + reach]);
  return gridLines(extent, GROUND.step, [...edges, ...verge, ...skirt]);
}

export function onRun(x: number, z: number): boolean {
  const { x: runX, z: runZ } = SITE.run;
  return x > runX[0] && x < runX[1] && z > runZ[0] && z < runZ[1];
}

export function groundGeometry(): BufferGeometry {
  const xs = axisLines(GROUND.centreX, SITE.run.x);
  const zs = axisLines(0, SITE.run.z);
  const positions: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  zs.forEach((z) =>
    xs.forEach((x) => {
      positions.push(x, GROUND.level, z);
      colours.push(...groundTint(x, z));
      uvs.push(x, z);
    }),
  );
  const indices: number[] = [];
  for (let row = 0; row < zs.length - 1; row += 1) {
    for (let column = 0; column < xs.length - 1; column += 1) {
      const centreX = (xs[column] + xs[column + 1]) / 2;
      const centreZ = (zs[row] + zs[row + 1]) / 2;
      if (onRun(centreX, centreZ)) continue;
      const a = row * xs.length + column;
      const b = a + xs.length;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return arrayGeometry(
    { position: positions, normal: upNormals(positions), color: colours, uv: uvs },
    indices,
  );
}
