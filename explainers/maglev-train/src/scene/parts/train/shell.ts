import { ShapeUtils, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import type { Extent } from '@core/scene/regions';
import { JOINT, NOSE, NOSE_REACH, WINDSCREEN } from './constants';
import { emitGrid, gridNormals } from './grid';
import { cross, dot, mirrorZ, RegionBuilders, sub } from './mesh';
import type { MeshBuilder } from './mesh';
import { noseDistance, surfacePoint } from './nose';
import type { EndKind, SectionEnds, Vec3 } from './nose';
import { CONTOUR } from './profile';
import type { BodyRegion } from './profile';

const STATION_EPSILON = 1e-6;

export function noseDistances(): number[] {
  return Array.from(
    { length: NOSE.stations + 1 },
    (_, step) => NOSE_REACH * (step / NOSE.stations) ** NOSE.stationCurve,
  );
}

function endStations(edgeX: number, kind: EndKind, direction: number): number[] {
  if (kind === 'open') return [edgeX];
  const distances = kind === 'joint' ? [...JOINT.edgeStations] : noseDistances();
  return distances.map((distance) => edgeX + direction * distance);
}

function bandEndStations(ends: SectionEnds): number[] {
  const marks: number[] = [];
  if (ends.front === 'nose') marks.push(ends.frontX - WINDSCREEN.bandEnd);
  if (ends.rear === 'nose') marks.push(ends.rearX + WINDSCREEN.bandEnd);
  return marks;
}

export function sectionStations(ends: SectionEnds, splits: readonly number[] = []): number[] {
  const all = [
    ...endStations(ends.rearX, ends.rear, 1),
    ...endStations(ends.frontX, ends.front, -1),
    ...bandEndStations(ends),
    ...splits,
  ]
    .filter((x) => x >= ends.rearX - STATION_EPSILON && x <= ends.frontX + STATION_EPSILON)
    .sort((a, b) => a - b);
  return all.filter((x, index) => index === 0 || x - all[index - 1] > STATION_EPSILON);
}

function isNoseWithin(x: number, ends: SectionEnds, reach: number): boolean {
  const distance = noseDistance(x, ends);
  return distance !== null && distance < reach;
}

function cellRegion(row: number, x: number, ends: SectionEnds): BodyRegion {
  const region = CONTOUR.cellRegions[row];
  if (region === 'band' && isNoseWithin(x, ends, WINDSCREEN.bandEnd)) return 'white';
  if (region === 'underbody' && isNoseWithin(x, ends, NOSE.lightBelly)) return 'white';
  return region;
}

function capPolygon(column: readonly Vec3[]): Vec3[] {
  const left = column.slice(1, -1).reverse().map(mirrorZ);
  return [...column, ...left];
}

function emitCap(builder: MeshBuilder, column: readonly Vec3[], outward: Vec3): void {
  const polygon = capPolygon(column);
  const outline = polygon.map(([, y, z]) => new Vector2(z, y));
  const indices = polygon.map((point) => builder.vertex(point, outward));
  ShapeUtils.triangulateShape(outline, []).forEach(([a, b, c]) => {
    const facing = dot(cross(sub(polygon[b], polygon[a]), sub(polygon[c], polygon[a])), outward);
    if (facing >= 0) builder.triangle(indices[a], indices[b], indices[c]);
    else builder.triangle(indices[a], indices[c], indices[b]);
  });
}

export function buildShell(
  ends: SectionEnds,
  range: Extent,
  splits: readonly number[],
  tag: string,
): Map<BodyRegion, BufferGeometry> {
  const stations = sectionStations(ends, splits).filter(
    (x) => x >= range[0] - STATION_EPSILON && x <= range[1] + STATION_EPSILON,
  );
  const points = stations.map((x) => CONTOUR.rows.map((row) => surfacePoint(row, x, ends)));
  const middle = (ends.rearX + ends.frontX) / 2;
  const isTip = (station: number) => noseDistance(stations[station], ends) === 0;
  const normals = gridNormals(points, (station) => [stations[station] > middle ? 1 : -1, 0, 0], {
    first: true,
    last: true,
    station: isTip,
  });
  const builders = new RegionBuilders<BodyRegion>();
  emitGrid(
    builders,
    points,
    normals,
    (station, row) => cellRegion(row, (stations[station] + stations[station + 1]) / 2, ends),
    tag,
  );
  const first = stations[0];
  const last = stations[stations.length - 1];
  if (ends.rear === 'joint' && Math.abs(first - ends.rearX) < STATION_EPSILON) {
    emitCap(builders.of('underbody'), points[0], [-1, 0, 0]);
  }
  if (ends.front === 'joint' && Math.abs(last - ends.frontX) < STATION_EPSILON) {
    emitCap(builders.of('underbody'), points[points.length - 1], [1, 0, 0]);
  }
  return builders.build();
}
