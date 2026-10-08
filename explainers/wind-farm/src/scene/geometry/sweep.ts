import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Vector2 } from 'three';

export interface SweepStation {
  x: number;
  scale: number;
}

export interface SweepCentre {
  y: number;
  z: number;
}

function stationPoint(point: Vector2, station: SweepStation, centre: SweepCentre): number[] {
  return [
    station.x,
    centre.y + (point.y - centre.y) * station.scale,
    centre.z + (point.x - centre.z) * station.scale,
  ];
}

function gridGeometry(positions: number[], rows: number, columns: number): BufferGeometry {
  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = a + columns;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function sweepProfile(
  profile: readonly Vector2[],
  stations: readonly SweepStation[],
  centre: SweepCentre,
): BufferGeometry {
  const positions = stations.flatMap((station) =>
    profile.flatMap((point) => stationPoint(point, station, centre)),
  );
  return gridGeometry(positions, stations.length, profile.length);
}

export function rimProfile(
  profile: readonly Vector2[],
  station: SweepStation,
  innerScale: number,
  centre: SweepCentre,
): BufferGeometry {
  const inner = { x: station.x, scale: station.scale * innerScale };
  const positions = [station, inner].flatMap((ring) =>
    profile.flatMap((point) => stationPoint(point, ring, centre)),
  );
  return gridGeometry(positions, 2, profile.length);
}

export function scaleAt(stations: readonly SweepStation[], x: number): number {
  const next = stations.findIndex((station) => station.x >= x);
  if (next < 0) return stations[stations.length - 1].scale;
  if (next === 0) return stations[0].scale;
  const [a, b] = [stations[next - 1], stations[next]];
  return a.scale + ((b.scale - a.scale) * (x - a.x)) / (b.x - a.x);
}

export function stationsBetween(
  stations: readonly SweepStation[],
  from: number,
  to: number,
): SweepStation[] {
  const inside = stations.filter((station) => station.x > from && station.x < to);
  return [
    { x: from, scale: scaleAt(stations, from) },
    ...inside,
    { x: to, scale: scaleAt(stations, to) },
  ];
}
