import { describe, expect, it } from 'vitest';
import { windingAngles } from '../../../model/kinematics';
import { MAINSPRING } from '../../../model/layout';
import { POWER_RESERVE_HOURS } from '../../../model/train';
import { BARREL_DRUM } from '../../constants';
import { spiralPath } from '../../geometry/spiral';
import { ARBOR_HOOK_ANGLE, mainspringSegments } from './mainspring';

const RESERVES = [0, 10.5, 21, 42];
const WINDING_SENSE = Math.sign(windingAngles(POWER_RESERVE_HOURS).arbor);

function segmentsAt(reserve: number) {
  return mainspringSegments(reserve, windingAngles(reserve).arbor);
}

describe('mainspring ribbon', () => {
  it('runs from the barrel wall hook to the arbor hook at every reserve', () => {
    RESERVES.forEach((reserve) => {
      const [outer, coil, inner] = segmentsAt(reserve);
      expect(outer.fromRadius).toBeLessThan(BARREL_DRUM.wallInner);
      expect(inner.toRadius).toBeGreaterThan(MAINSPRING.arborRadiusMm);
      [outer, coil, inner].forEach((segment) =>
        expect(Math.sign(segment.sweep), `sweep at ${reserve} h`).toBe(WINDING_SENSE),
      );
    });
  });

  it('ends on the arbor hook as the arbor turns', () => {
    RESERVES.forEach((reserve) => {
      const path = spiralPath(segmentsAt(reserve));
      const last = path.length - 2;
      const end = Math.atan2(path[last + 1], path[last]);
      const hook = ARBOR_HOOK_ANGLE + (windingAngles(reserve).arbor * Math.PI) / 180;
      expect(Math.cos(end - hook), `hook at ${reserve} h`).toBeCloseTo(1, 6);
    });
  });

  it('packs the coil against the arbor side when wound and against the wall when run down', () => {
    const wound = segmentsAt(42)[1];
    const empty = segmentsAt(0)[1];
    expect(wound.toRadius).toBeLessThan(empty.toRadius);
    expect(wound.fromRadius).toBeLessThan(empty.fromRadius);
    expect(Math.abs(wound.sweep)).toBeGreaterThan(Math.abs(empty.sweep));
  });
});
