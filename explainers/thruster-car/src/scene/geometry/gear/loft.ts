import type { Vector3 } from 'three';
import { BufferAttribute, BufferGeometry } from 'three';

export type Section = readonly (readonly [side: number, up: number])[];

export interface Station {
  centre: Vector3;
  side: Vector3;
  up: Vector3;
  width: number;
  depth: number;
}

const XYZ = 3;

function sectionPoint(station: Station, [side, up]: Section[number]): Vector3 {
  return station.centre
    .clone()
    .addScaledVector(station.side, side * station.width)
    .addScaledVector(station.up, up * station.depth);
}

export function loftFaceted(stations: readonly Station[], section: Section): BufferGeometry {
  const rings = stations.map((station) => section.map((point) => sectionPoint(station, point)));
  const positions: number[] = [];
  const push = (...points: Vector3[]) =>
    points.forEach((point) => positions.push(...point.toArray()));
  for (let index = 0; index < rings.length - 1; index += 1) {
    const [near, far] = [rings[index], rings[index + 1]];
    near.forEach((point, around) => {
      const next = (around + 1) % near.length;
      push(point, near[next], far[around], near[next], far[next], far[around]);
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.computeVertexNormals();
  return geometry;
}
