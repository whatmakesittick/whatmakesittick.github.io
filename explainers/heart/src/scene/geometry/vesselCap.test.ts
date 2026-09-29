import { describe, expect, it } from 'vitest';
import { capsule } from './field';
import { ownerAt, vesselCaps, vesselSection } from './vesselCap';

const GRID = { min: [-30, -30] as const, max: [30, 30] as const, cell: 0.5 };
const TRUNK = {
  outer: capsule([0, -40, 0], [0, 0, 0], 8),
  inner: capsule([0, -40, 0], [0, 0, 0], 6),
  owner: 0,
};
const BRANCH = {
  outer: capsule([0, 0, 0], [40, 20, 0], 6),
  inner: capsule([0, 0, 0], [40, 20, 0], 4.5),
  owner: 1,
};

describe('vessel cut faces', () => {
  it('merges the cut faces of two joined vessels into one wall outline', () => {
    const section = vesselSection([TRUNK, BRANCH], [], []);
    expect(section(0, -20)).toBeGreaterThan(0);
    expect(section(7, -20)).toBeLessThan(0);
    expect(section(0, 0)).toBeGreaterThan(0);
    expect(section(3, 5)).toBeGreaterThan(0);
  });

  it('clips the faces and gives each piece to its nearest vessel', () => {
    const clipped = vesselSection([TRUNK], [], [(_x, y) => y + 10]);
    expect(clipped(7, -5)).toBeGreaterThan(0);
    expect(ownerAt([TRUNK, BRANCH], 30, 15)).toBe(1);
    expect(ownerAt([TRUNK, BRANCH], 0, -30)).toBe(0);
    const caps = vesselCaps(
      vesselSection([TRUNK, BRANCH], [], []),
      [TRUNK, BRANCH],
      new Map([
        [0, '#ff0000'],
        [1, '#0000ff'],
      ]),
      {
        depthMm: -0.05,
        grid: GRID,
      },
    );
    expect([...caps.keys()].sort()).toEqual([0, 1]);
    const positions = caps.get(0)?.getAttribute('position').array ?? [];
    expect(positions[2]).toBeCloseTo(-0.05, 5);
  });
});
