import { describe, expect, it } from 'vitest';
import {
  isInsideGrain,
  layPlates,
  packSand,
  placeBubbles,
  plateCover,
  sandCover,
  seededRandom,
} from './grains';
import type { Grain, PlateFabric } from './grains';

const SIZE = { width: 480, height: 240 } as const;
const SEED = 20260928;
const TOUCHING_GAP = 3;
const GRAINS_ACROSS = 8;
const ROW_STEP = (SIZE.width / GRAINS_ACROSS) * (Math.sqrt(3) / 2);
const LARGE_RADIUS = 20;
const SMALL_RADIUS = 15;
const POROSITY_TOLERANCE = 0.015;
const CLAY: PlateFabric = { length: 70, thickness: 12, tilt: -0.12 };
const SHALE: PlateFabric = { length: 90, thickness: 10, tilt: -0.09 };

function gapBetween(a: Grain, b: Grain): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
}

function insideView(grain: Grain): boolean {
  return grain.x >= 0 && grain.x < SIZE.width && grain.y >= 0 && grain.y < SIZE.height;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

describe('packed sand', () => {
  const sand = packSand(SIZE, 0.22, SEED);
  const large = sand.filter(insideView).filter((grain) => grain.radius > LARGE_RADIUS);

  it('repeats the same random numbers for the same seed', () => {
    const first = seededRandom(7);
    const second = seededRandom(7);
    const values = [first(), first(), first()];
    expect([second(), second(), second()]).toEqual(values);
    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it('draws the same grains every time', () => {
    expect(packSand(SIZE, 0.22, SEED)).toEqual(sand);
  });

  it.each([0.22, 0.25])('leaves %s of the view as pore space', (porosity) => {
    const grains = porosity === 0.22 ? sand : packSand(SIZE, porosity, SEED);
    expect(Math.abs(1 - sandCover(grains, SIZE) - porosity)).toBeLessThan(POROSITY_TOLERANCE);
  });

  it('packs about eight large grains across in four or five rows', () => {
    const rows = new Set(large.map((grain) => Math.round(grain.y / ROW_STEP)));
    expect(large.length).toBeGreaterThanOrEqual(30);
    expect(large.length).toBeLessThanOrEqual(42);
    expect(rows.size).toBeGreaterThanOrEqual(4);
    expect(rows.size).toBeLessThanOrEqual(6);
    expect(median(large.map((grain) => grain.radius))).toBeGreaterThanOrEqual(26);
    expect(median(large.map((grain) => grain.radius))).toBeLessThanOrEqual(31);
  });

  it('lets grains touch without overlapping', () => {
    sand.forEach((grain, index) =>
      sand
        .slice(index + 1)
        .forEach((other) => expect(gapBetween(grain, other)).toBeGreaterThan(-1e-6)),
    );
    large.forEach((grain) => {
      const nearest = Math.min(
        ...sand.filter((other) => other !== grain).map((other) => gapBetween(grain, other)),
      );
      expect(nearest).toBeLessThan(TOUCHING_GAP);
    });
  });

  it('tucks a few small grains into the big gaps', () => {
    const small = sand.filter(insideView).filter((grain) => grain.radius < SMALL_RADIUS);
    expect(small.length).toBeGreaterThan(0);
    expect(small.length).toBeLessThan(large.length / 2);
  });

  it('keeps every grain outline inside its own circle', () => {
    sand.forEach((grain) =>
      grain.outline.forEach((point) =>
        expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(1 + 1e-9),
      ),
    );
    const [first] = large;
    expect(isInsideGrain(first, first)).toBe(true);
    expect(isInsideGrain(first, { x: first.x + first.radius + 1, y: first.y })).toBe(false);
  });

  it('floats gas bubbles in the pores clear of the grains', () => {
    const bubbles = placeBubbles(sand, SIZE, 7);
    expect(bubbles.length).toBeGreaterThan(3);
    bubbles.forEach((bubble) =>
      sand.forEach((grain) =>
        expect(Math.hypot(bubble.x - grain.x, bubble.y - grain.y)).toBeGreaterThan(
          grain.radius + bubble.radius,
        ),
      ),
    );
  });
});

describe('laid plates', () => {
  it.each([
    ['loose seabed clay', CLAY, 0.45],
    ['claystone', CLAY, 0.3],
    ['shale and sands', SHALE, 0.15],
    ['the tight seal', SHALE, 0.05],
  ] as const)('leaves the right share of pore space in %s', (_name, fabric, porosity) => {
    const bed = layPlates(SIZE, fabric, porosity, SEED);
    expect(Math.abs(1 - plateCover(bed, SIZE) - porosity)).toBeLessThan(0.02);
  });

  it('tilts the bed and staggers the rows like bricks', () => {
    const bed = layPlates(SIZE, SHALE, 0.05, SEED);
    expect(bed.tilt).toBe(SHALE.tilt);
    const [firstRow, secondRow] = [...new Set(bed.plates.map((plate) => plate.y))];
    const rowStart = (y: number) => {
      const plate = bed.plates.find((candidate) => candidate.y === y);
      return plate ? plate.x - plate.length / 2 : NaN;
    };
    expect(rowStart(firstRow)).not.toBeCloseTo(rowStart(secondRow), 0);
  });
});
