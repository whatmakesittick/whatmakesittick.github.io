import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import { boxOver, evenlySpaced, extrudeAlongZ, mergeParts, sideShape } from '../geometry';
import { ESCALATOR, FLOOR, HALL, LINK, PLATFORM } from './constants';
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

function hall(spec: BuildingSpec): BuildingParts {
  const roofBottom = spec.height;
  const glassX = grown(spec.x, -HALL.glassInset);
  const glassZ = grown(spec.z, -HALL.glassInset);
  const finCount = Math.round((glassX[1] - glassX[0]) / spec.finSpacing);
  const finHalf = HALL.finWidth / 2;
  const fins = evenlySpaced(finCount, ...glassX).map((x) =>
    boxOver(
      [x - finHalf, x + finHalf],
      [HALL.plinth, roofBottom],
      [glassZ[0] - HALL.finDepth, glassZ[0]],
    ),
  );
  const bands = Array.from({ length: spec.bands - 1 }, (_, index) => {
    const y = HALL.plinth + ((roofBottom - HALL.plinth) * (index + 1)) / spec.bands;
    return boxOver(
      glassX,
      [y - HALL.bandHeight / 2, y + HALL.bandHeight / 2],
      [glassZ[0] - HALL.finDepth / 2, glassZ[1]],
    );
  });
  return {
    concrete: [boxOver(spec.x, [0, HALL.plinth], spec.z)],
    glass: [],
    facade: [boxOver(glassX, [HALL.plinth, roofBottom], glassZ)],
    trim: fins,
    paint: [
      boxOver(
        grown(spec.x, HALL.roofOverhang),
        [roofBottom, roofBottom + HALL.roofThickness],
        grown(spec.z, HALL.roofOverhang),
      ),
      ...bands,
    ],
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

function link(spec: BuildingSpec): BuildingParts {
  const z: Span = [PLATFORM.outer, spec.z[0]];
  return {
    concrete: [boxOver(LINK.x, [FLOOR - LINK.floorThickness, FLOOR], z)],
    glass: [boxOver(LINK.x, [FLOOR, FLOOR + LINK.height], z)],
    facade: [],
    trim: [],
    paint: [
      boxOver(
        grown(LINK.x, HALL.roofOverhang / 4),
        [FLOOR + LINK.height, FLOOR + LINK.height + LINK.floorThickness],
        z,
      ),
    ],
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
    ...(style.link ? [link(style.hall)] : []),
  ]);
}

export function merged(parts: readonly BufferGeometry[]): BufferGeometry | null {
  return parts.length > 0 ? mergeParts(parts) : null;
}
