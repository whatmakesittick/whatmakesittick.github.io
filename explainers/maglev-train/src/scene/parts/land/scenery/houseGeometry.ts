import type { BufferGeometry } from 'three';
import { FaceBuilder } from './faceBuilder';
import type { Rgb } from './faceBuilder';
import type { HouseKind } from './villagePlacement';

interface Facade {
  readonly storeys: number;
  readonly across: number;
  readonly sideAcross: number;
  readonly window: readonly [number, number];
  readonly sill: number;
  readonly door: readonly [number, number];
}

interface HouseDesign {
  readonly size: readonly [length: number, height: number, depth: number];
  readonly roof: 'hip' | 'gable';
  readonly rise: number;
  readonly overhang: number;
  readonly facade: Facade;
}

export const HOUSE_DESIGNS: Readonly<Record<HouseKind, HouseDesign>> = {
  villa: {
    size: [13.5, 9.9, 10],
    roof: 'hip',
    rise: 2.9,
    overhang: 0.6,
    facade: {
      storeys: 3,
      across: 4,
      sideAcross: 2,
      window: [1.6, 1.5],
      sill: 0.95,
      door: [2, 2.5],
    },
  },
  house: {
    size: [11.5, 6.7, 8.75],
    roof: 'gable',
    rise: 2.4,
    overhang: 0.5,
    facade: {
      storeys: 2,
      across: 3,
      sideAcross: 1,
      window: [1.5, 1.4],
      sill: 0.95,
      door: [1.8, 2.3],
    },
  },
  workshop: {
    size: [20, 5.3, 12],
    roof: 'gable',
    rise: 1.1,
    overhang: 0.4,
    facade: {
      storeys: 1,
      across: 5,
      sideAcross: 2,
      window: [2.2, 0.9],
      sill: 3.2,
      door: [4.2, 3.6],
    },
  },
};

const WALL: Rgb = [1, 1, 1];
const GLASS: Rgb = [0.16, 0.2, 0.25];
const DOOR: Rgb = [0.34, 0.27, 0.22];
const PLINTH: Rgb = [0.62, 0.6, 0.56];
const SOFFIT: Rgb = [0.55, 0.55, 0.55];
const ROOF: Rgb = [1, 1, 1];
const INSET = 0.04;
const PLINTH_HEIGHT = 0.5;
const PLINTH_OUT = 0.06;

type Face = 'south' | 'north' | 'east' | 'west';

function facePoint(
  face: Face,
  along: number,
  up: number,
  half: readonly [number, number],
  out = 0,
) {
  const [hx, hz] = half;
  switch (face) {
    case 'south':
      return [along, up, hz + out] as const;
    case 'north':
      return [-along, up, -hz - out] as const;
    case 'east':
      return [hx + out, up, -along] as const;
    default:
      return [-hx - out, up, along] as const;
  }
}

function panel(
  builder: FaceBuilder,
  face: Face,
  half: readonly [number, number],
  [from, to]: readonly [number, number],
  [bottom, top]: readonly [number, number],
  colour: Rgb,
  out = INSET,
): void {
  builder.quad(
    facePoint(face, from, bottom, half, out),
    facePoint(face, to, bottom, half, out),
    facePoint(face, to, top, half, out),
    facePoint(face, from, top, half, out),
    colour,
  );
}

function windows(
  builder: FaceBuilder,
  design: HouseDesign,
  face: Face,
  half: readonly [number, number],
) {
  const { facade, size } = design;
  const width = face === 'south' || face === 'north' ? half[0] * 2 : half[1] * 2;
  const count = face === 'south' || face === 'north' ? facade.across : facade.sideAcross;
  const storey = size[1] / facade.storeys;
  const [windowWidth, windowHeight] = facade.window;
  for (let level = 0; level < facade.storeys; level += 1)
    for (let index = 0; index < count; index += 1) {
      const centre = -width / 2 + (width * (index + 0.5)) / count;
      const isDoor = face === 'south' && level === 0 && index === Math.floor(count / 2);
      const [w, h] = isDoor ? facade.door : [windowWidth, windowHeight];
      const bottom = isDoor ? 0 : level * storey + facade.sill;
      panel(
        builder,
        face,
        half,
        [centre - w / 2, centre + w / 2],
        [bottom, bottom + h],
        isDoor ? DOOR : GLASS,
      );
    }
}

function walls(design: HouseDesign): BufferGeometry {
  const builder = new FaceBuilder();
  const [length, height, depth] = design.size;
  const half = [length / 2, depth / 2] as const;
  const faces: Face[] = ['south', 'north', 'east', 'west'];
  faces.forEach((face) => {
    const width = face === 'south' || face === 'north' ? length : depth;
    panel(builder, face, half, [-width / 2, width / 2], [0, height], WALL, 0);
    panel(
      builder,
      face,
      half,
      [-width / 2 - PLINTH_OUT, width / 2 + PLINTH_OUT],
      [0, PLINTH_HEIGHT],
      PLINTH,
      PLINTH_OUT,
    );
    windows(builder, design, face, half);
  });
  if (design.roof === 'gable')
    [1, -1].forEach((side) => {
      const x = (side * length) / 2;
      builder.triangle(
        [x, height, side * half[1]],
        [x, height, -side * half[1]],
        [x, height + design.rise, 0],
        WALL,
      );
    });
  return builder.geometry();
}

function roof(design: HouseDesign): BufferGeometry {
  const builder = new FaceBuilder();
  const [length, height, depth] = design.size;
  const a = length / 2 + design.overhang;
  const b = depth / 2 + design.overhang;
  const top = height + design.rise;
  const ridge = design.roof === 'hip' ? Math.max(0, a - b) : a;
  builder.quad([-a, height, b], [a, height, b], [ridge, top, 0], [-ridge, top, 0], ROOF);
  builder.quad([a, height, -b], [-a, height, -b], [-ridge, top, 0], [ridge, top, 0], ROOF);
  if (design.roof === 'hip') {
    builder.triangle([a, height, b], [a, height, -b], [ridge, top, 0], ROOF);
    builder.triangle([-a, height, -b], [-a, height, b], [-ridge, top, 0], ROOF);
  }
  builder.quad([-a, height, -b], [a, height, -b], [a, height, b], [-a, height, b], SOFFIT);
  return builder.geometry();
}

export function houseGeometries(kind: HouseKind): { walls: BufferGeometry; roof: BufferGeometry } {
  const design = HOUSE_DESIGNS[kind];
  return { walls: walls(design), roof: roof(design) };
}
