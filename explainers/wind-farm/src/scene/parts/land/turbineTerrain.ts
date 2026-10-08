import type { BufferGeometry } from 'three';
import { TURBINE_LAND } from '../../../model/layout';
import { TURBINE_GROUND } from './constants';
import type { Projection } from './projection';
import { terrainAttributes } from './terrainAttributes';
import { turbineGroundAlpha, turbineGroundTint, turbineLandHeight } from './turbineGround';

const FULL_TURN = Math.PI * 2;

export function ringRadii(): number[] {
  const { firstRingStep, segments } = TURBINE_GROUND;
  const growth = FULL_TURN / segments;
  const radii = [0];
  while (radii[radii.length - 1] < TURBINE_LAND.radius) {
    const last = radii[radii.length - 1];
    radii.push(last + firstRingStep + growth * last);
  }
  const scale = TURBINE_LAND.radius / radii[radii.length - 1];
  return radii.map((radius) => radius * scale);
}

function ringIndices(rings: number, segments: number): number[] {
  const indices: number[] = [];
  const at = (ring: number, step: number) => 1 + (ring - 1) * segments + (step % segments);
  for (let step = 0; step < segments; step += 1) {
    indices.push(0, at(1, step + 1), at(1, step));
    for (let ring = 1; ring < rings; ring += 1) {
      const [a, b, c, d] = [
        at(ring, step),
        at(ring, step + 1),
        at(ring + 1, step),
        at(ring + 1, step + 1),
      ];
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
}

export function turbineTerrainGeometry(projection: Projection): BufferGeometry {
  const { segments } = TURBINE_GROUND;
  const radii = ringRadii();
  const rings = radii.length - 1;
  const attributes = terrainAttributes(1 + rings * segments, projection);
  const write = (index: number, x: number, z: number) =>
    attributes.write(
      index,
      [x, turbineLandHeight(x, z), z],
      turbineGroundTint(x, z),
      turbineGroundAlpha(x, z),
    );
  write(0, 0, 0);
  for (let ring = 1; ring <= rings; ring += 1) {
    for (let step = 0; step < segments; step += 1) {
      const angle = (step / segments) * FULL_TURN;
      const index = 1 + (ring - 1) * segments + step;
      write(index, radii[ring] * Math.cos(angle), radii[ring] * Math.sin(angle));
    }
  }
  return attributes.geometry(ringIndices(rings, segments));
}
