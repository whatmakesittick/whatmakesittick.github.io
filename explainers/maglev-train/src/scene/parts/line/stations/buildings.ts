import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  around,
  boxOver,
  evenlySpaced,
  extrudeAlongX,
  extrudeAlongZ,
  profileShape,
  sideSpan,
} from '../geometry';
import type { ProfilePoint, Span } from '../geometry';
import { rectangle } from '../profiles';
import { ESCALATOR, FLOOR, HALL } from './constants';
import type { BuildingSpec, StationStyle } from './constants';

export interface BuildingParts {
  readonly concrete: BufferGeometry[];
  readonly glass: BufferGeometry[];
  readonly facade: BufferGeometry[];
  readonly paint: BufferGeometry[];
}

const HALL_Z: Span = [-HALL.halfWidth, HALL.halfWidth];

function grown([from, to]: readonly [number, number], by: number): Span {
  return [from - by, to + by];
}

function finsAlong(
  span: Span,
  every: number,
  place: (at: number) => BufferGeometry,
): BufferGeometry[] {
  return evenlySpaced(Math.round((span[1] - span[0]) / every), ...span).map(place);
}

function outward([low, high]: Span, side: number): Span {
  return side > 0 ? [high, high + HALL.finDepth] : [low - HALL.finDepth, low];
}

function hallFins(spec: BuildingSpec, glassX: Span, glassZ: Span): BufferGeometry[] {
  const height: Span = [HALL.plinth, HALL.height];
  const fin = (at: number) => around(at, HALL.finWidth);
  return SIDE_SIGNS.flatMap((side) => [
    ...finsAlong(glassX, spec.finSpacing, (x) => boxOver(fin(x), height, outward(glassZ, side))),
    ...finsAlong(glassZ, spec.finSpacing, (z) => boxOver(outward(glassX, side), height, fin(z))),
  ]);
}

function hallBands(spec: BuildingSpec, glassX: Span, glassZ: Span): BufferGeometry[] {
  const ringX = grown(glassX, HALL.finDepth / 2);
  const ringZ = grown(glassZ, HALL.finDepth / 2);
  return Array.from({ length: spec.bands - 1 }, (_, index) => {
    const y = HALL.plinth + ((HALL.height - HALL.plinth) * (index + 1)) / spec.bands;
    return boxOver(ringX, around(y, HALL.bandHeight), ringZ);
  });
}

function hallRoof(spec: BuildingSpec): BufferGeometry {
  const [left, right] = grown(HALL_Z, HALL.roofOverhang);
  const outline = rectangle(left, right, HALL.height, HALL.height + HALL.roofThickness);
  const [startX, endX] = grown(spec.x, HALL.roofOverhang);
  return extrudeAlongX(profileShape(outline), startX, endX, HALL.roofChamfer);
}

function escalatorProfile(lift: number, height: number, start: number): ProfilePoint[] {
  const { run, landing } = ESCALATOR;
  const top = FLOOR + lift;
  const bottom = lift;
  return [
    [start, bottom],
    [start + landing, bottom],
    [start + run - landing, top],
    [start + run, top],
    [start + run, top + height],
    [start + run - landing, top + height],
    [start + landing, bottom + height],
    [start, bottom + height],
  ];
}

function escalators(style: StationStyle, lift: number, height: number): BufferGeometry[] {
  return SIDE_SIGNS.map((side) => {
    const start = style.escalatorX - side * ESCALATOR.run;
    const shape = profileShape(escalatorProfile(lift, height, start));
    return extrudeAlongZ(
      shape,
      ...sideSpan(side, ESCALATOR.inner, ESCALATOR.inner + ESCALATOR.width),
    );
  });
}

export function stationBuildings(style: StationStyle): BuildingParts {
  const { hall } = style;
  const glassX = grown(hall.x, -HALL.glassInset);
  const glassZ = grown(HALL_Z, -HALL.glassInset);
  return {
    concrete: [
      boxOver(hall.x, [0, HALL.plinth], HALL_Z),
      ...escalators(style, -ESCALATOR.deck, ESCALATOR.deck),
    ],
    glass: escalators(style, 0, ESCALATOR.enclosure),
    facade: [boxOver(glassX, [HALL.plinth, HALL.height], glassZ)],
    paint: [
      hallRoof(hall),
      ...hallFins(hall, glassX, glassZ),
      ...hallBands(hall, glassX, glassZ),
      ...escalators(style, ESCALATOR.enclosure, ESCALATOR.roof),
    ],
  };
}
