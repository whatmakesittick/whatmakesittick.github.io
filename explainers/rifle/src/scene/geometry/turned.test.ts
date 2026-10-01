import { describe, expect, it } from 'vitest';
import { KEPT_HALF, turnOutline, turnStrands, turnedCap } from './turned';
import type { TurnStrand } from './turned';
import { facing, triangles, zRange } from './testing';

const RING: TurnStrand[] = [
  [
    [0, 5],
    [10, 5],
  ],
  [
    [10, 5],
    [10, 3],
  ],
  [
    [10, 3],
    [0, 3],
  ],
  [
    [0, 3],
    [0, 5],
  ],
];

describe('turned parts', () => {
  it('joins strands into one outline without repeated corners', () => {
    expect(turnOutline(RING)).toHaveLength(4);
  });

  it('turns only the kept half for the cutaway', () => {
    expect(zRange(turnStrands(RING, 32, KEPT_HALF))[1]).toBeLessThanOrEqual(1e-9);
    expect(zRange(turnStrands(RING, 32))[1]).toBeCloseTo(5);
  });

  it('caps both halves of the section on the cut plane facing plus z', () => {
    const cap = triangles(turnedCap(turnOutline(RING)));
    const total = cap.reduce((sum, triangle) => sum + facing(triangle).z, 0);
    expect(total).toBeCloseTo(2 * 10 * 2);
    for (const triangle of cap) expect(facing(triangle).z).toBeGreaterThan(0);
  });
});
