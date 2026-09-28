import { describe, expect, it } from 'vitest';
import { packGrains, seededRandom } from './grains';
import type { Grain, GrainPacking } from './grains';

const SIZE = { width: 480, height: 240 } as const;
const SAND: GrainPacking = { spacing: 24, flatten: 1 };
const SHALE: GrainPacking = { spacing: 18, flatten: 0.55 };
const SAMPLE_STEP = 3;

function coveredShare(grains: readonly Grain[], packing: GrainPacking): number {
  let covered = 0;
  let samples = 0;
  for (let y = 0; y < SIZE.height; y += SAMPLE_STEP) {
    for (let x = 0; x < SIZE.width; x += SAMPLE_STEP) {
      samples++;
      const inside = grains.some((grain) => {
        const dx = x - grain.x;
        const dy = (y - grain.y) / packing.flatten;
        return dx * dx + dy * dy <= grain.radius * grain.radius;
      });
      if (inside) covered++;
    }
  }
  return covered / samples;
}

describe('packed grains', () => {
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
    expect(packGrains(SIZE.width, SIZE.height, SAND, 0.22, 3)).toEqual(
      packGrains(SIZE.width, SIZE.height, SAND, 0.22, 3),
    );
  });

  it.each([
    ['loose clay', SAND, 0.45],
    ['sandstone', SAND, 0.22],
    ['tight shale', SHALE, 0.05],
  ] as const)('leaves about the right share of pore space in %s', (_name, packing, porosity) => {
    const grains = packGrains(SIZE.width, SIZE.height, packing, porosity, 1);
    expect(1 - coveredShare(grains, packing)).toBeCloseTo(porosity, 1);
  });
});
