import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  boxOver,
  evenlySpaced,
  extrudeAlongX,
  extrudeAlongZ,
  mergeParts,
  profileShape,
  sideShape,
} from '../geometry';
import type { ProfilePoint } from '../geometry';
import { ESCALATOR, FLOOR, HALL } from './constants';
import type { BuildingSpec, StationStyle } from './constants';

type Span = readonly [number, number];
type Point = readonly [number, number];

export interface BuildingParts {
  readonly concrete: BufferGeometry[];
  readonly glass: BufferGeometry[];
  readonly facade: BufferGeometry[];
  readonly trim: BufferGeometry[];
  readonly paint: BufferGeometry[];
}

function grown([from, to]: Span, by: number): [number, number] {
  return [from - by, to + by];
}

function finsAlong(
  span: Span,
  every: number,
  place: (at: number) => BufferGeometry,
): BufferGeometry[] {
  return evenlySpaced(Math.round((span[1] - span[0]) / every), ...span).map(place);
}

function hallFins(spec: BuildingSpec, glassX: Span, glassZ: Span): BufferGeometry[] {
  const half = HALL.finWidth / 2;
  const height: Span = [HALL.plinth, spec.height];
  const onLongFace = (z: number, outward: number) => (x: number) =>
    boxOver([x - half, x + half], height, [Math.min(z, z + outward), Math.max(z, z + outward)]);
  const onEndFace = (x: number, outward: number) => (z: number) =>
    boxOver([Math.min(x, x + outward), Math.max(x, x + outward)], height, [z - half, z + half]);
  return [
    ...finsAlong(glassX, spec.finSpacing, onLongFace(glassZ[0], -HALL.finDepth)),
    ...finsAlong(glassX, spec.finSpacing, onLongFace(glassZ[1], HALL.finDepth)),
    ...finsAlong(glassZ, spec.finSpacing, onEndFace(glassX[0], -HALL.finDepth)),
    ...finsAlong(glassZ, spec.finSpacing, onEndFace(glassX[1], HALL.finDepth)),
  ];
}

function hallBands(spec: BuildingSpec, glassX: Span, glassZ: Span): BufferGeometry[] {
  const ringX = grown(glassX, HALL.finDepth / 2);
  const ringZ = grown(glassZ, HALL.finDepth / 2);
  return Array.from({ length: spec.bands - 1 }, (_, index) => {
    const y = HALL.plinth + ((spec.height - HALL.plinth) * (index + 1)) / spec.bands;
    return boxOver(ringX, [y - HALL.bandHeight / 2, y + HALL.bandHeight / 2], ringZ);
  });
}

function roofRise(spec: BuildingSpec): (z: number) => number {
  const [from, to] = grown(spec.z, HALL.roofOverhang);
  const middle = (from + to) / 2;
  const half = (to - from) / 2;
  return (z) => spec.roofRise * (1 - ((z - middle) / half) ** 2);
}

function stepsAcross([from, to]: Span): number[] {
  return Array.from(
    { length: HALL.roofSteps + 1 },
    (_, step) => from + ((to - from) * step) / HALL.roofSteps,
  );
}

function hallRoof(spec: BuildingSpec): BufferGeometry {
  const rise = roofRise(spec);
  const steps = stepsAcross(grown(spec.z, HALL.roofOverhang));
  const top = steps.map((z): ProfilePoint => [z, spec.height + HALL.roofThickness + rise(z)]);
  const bottom = [...steps].reverse().map((z): ProfilePoint => [z, spec.height + rise(z)]);
  const [startX, endX] = grown(spec.x, HALL.roofOverhang);
  return extrudeAlongX(profileShape([...top, ...bottom]), startX, endX, HALL.roofChamfer);
}

function hallAttic(spec: BuildingSpec, glassX: Span, glassZ: Span): BufferGeometry {
  const rise = roofRise(spec);
  const under = stepsAcross(glassZ).map((z): ProfilePoint => [z, spec.height + rise(z)]);
  const base: ProfilePoint[] = [
    [glassZ[1], spec.height],
    [glassZ[0], spec.height],
  ];
  return extrudeAlongX(profileShape([...under, ...base]), ...glassX);
}

function hall(spec: BuildingSpec): BuildingParts {
  const glassX = grown(spec.x, -HALL.glassInset);
  const glassZ = grown(spec.z, -HALL.glassInset);
  return {
    concrete: [boxOver(spec.x, [0, HALL.plinth], spec.z)],
    glass: [],
    facade: [boxOver(glassX, [HALL.plinth, spec.height], glassZ), hallAttic(spec, glassX, glassZ)],
    trim: [],
    paint: [hallRoof(spec), ...hallFins(spec, glassX, glassZ), ...hallBands(spec, glassX, glassZ)],
  };
}

function escalatorProfile(lift: number, height: number, start: number): Point[] {
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

function escalator(start: number, side: number): BuildingParts {
  const z: Span =
    side > 0
      ? [ESCALATOR.inner, ESCALATOR.inner + ESCALATOR.width]
      : [-ESCALATOR.inner - ESCALATOR.width, -ESCALATOR.inner];
  const deck = -ESCALATOR.deck;
  const shape = (lift: number, height: number) =>
    extrudeAlongZ(sideShape(escalatorProfile(lift, height, start)), ...z);
  return {
    concrete: [shape(deck, ESCALATOR.deck)],
    glass: [shape(0, ESCALATOR.enclosure)],
    facade: [],
    trim: [],
    paint: [shape(ESCALATOR.enclosure, ESCALATOR.roof)],
  };
}

function combine(parts: readonly BuildingParts[]): BuildingParts {
  const pick = (key: keyof BuildingParts) => parts.flatMap((part) => part[key]);
  return {
    concrete: pick('concrete'),
    glass: pick('glass'),
    facade: pick('facade'),
    trim: pick('trim'),
    paint: pick('paint'),
  };
}

export function stationBuildings(style: StationStyle): BuildingParts {
  return combine([
    hall(style.hall),
    ...SIDE_SIGNS.map((side) => escalator(style.escalatorX - side * ESCALATOR.run, side)),
  ]);
}

export function merged(parts: readonly BufferGeometry[]): BufferGeometry | null {
  return parts.length > 0 ? mergeParts(parts) : null;
}
