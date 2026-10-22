import { ShapeUtils, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import type { Extent } from '@core/scene/regions';
import { JOINT, NOSE, NOSE_REACH, WINDSCREEN } from './constants';
import { emitGrid, gridNormals, shares } from './grid';
import { mirrorZ, RegionBuilders } from './mesh';
import type { MeshBuilder } from './mesh';
import { noseDistance, surfacePoint } from './nose';
import type { EndKind, SectionEnds, Vec3 } from './nose';
import { CONTOUR } from './profile';
import type { BodyRegion } from './profile';

const STATION_EPSILON = 1e-6;

function endStations(edgeX: number, kind: EndKind, direction: number): number[] {
  const distances =
    kind === 'joint'
      ? JOINT.edgeStations
      : [
          ...shares(NOSE.stations).map((share) => NOSE_REACH * share ** NOSE.stationCurve),
          WINDSCREEN.bandEnd,
        ];
  return distances.map((distance) => edgeX + direction * distance);
}

export function sectionStations(ends: SectionEnds, splits: readonly number[] = []): number[] {
  const all = [
    ...endStations(ends.rearX, ends.rear, 1),
    ...endStations(ends.frontX, ends.front, -1),
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

function emitCap(builder: MeshBuilder, column: readonly Vec3[], direction: number): void {
  const polygon = capPolygon(column);
  const indices = polygon.map((point) => builder.vertex(point, [direction, 0, 0]));
  const outline = polygon.map(([, y, z]) => new Vector2(z, y));
  ShapeUtils.triangulateShape(outline, []).forEach(([a, b, c]) => {
    if (direction < 0) builder.triangle(indices[a], indices[b], indices[c]);
    else builder.triangle(indices[a], indices[c], indices[b]);
  });
}

export function buildShell(
  ends: SectionEnds,
  range: Extent,
  splits: readonly number[],
): Map<BodyRegion, BufferGeometry> {
  const stations = sectionStations(ends, splits).filter(
    (x) => x >= range[0] - STATION_EPSILON && x <= range[1] + STATION_EPSILON,
  );
  const points = stations.map((x) => CONTOUR.rows.map((row) => surfacePoint(row, x, ends)));
  const middle = (ends.rearX + ends.frontX) / 2;
  const isTip = (station: number) => noseDistance(stations[station], ends) === 0;
  const normals = gridNormals(
    points,
    (station) => [stations[station] > middle ? 1 : -1, 0, 0],
    true,
    isTip,
  );
  const builders = new RegionBuilders<BodyRegion>();
  emitGrid(
    (station, row) =>
      builders.of(cellRegion(row, (stations[station] + stations[station + 1]) / 2, ends)),
    points,
    normals,
    'shell',
  );
  if (ends.rear === 'joint' && range[0] === ends.rearX) {
    emitCap(builders.of('underbody'), points[0], -1);
  }
  if (ends.front === 'joint' && range[1] === ends.frontX) {
    emitCap(builders.of('underbody'), points[points.length - 1], 1);
  }
  return builders.build();
}
