import { describe, expect, it } from 'vitest';
import { windingAngles } from '../../../model/kinematics';
import { MAINSPRING } from '../../../model/layout';
import { BARREL_DRUM } from '../../constants';
import { mainspringSegments } from './mainspring';

describe('mainspring ribbon', () => {
  it('runs from the barrel wall hook to the arbor hook at every reserve', () => {
    [0, 10.5, 21, 42].forEach((reserve) => {
      const segments = mainspringSegments(reserve, windingAngles(reserve).arbor);
      const [outer, coil, inner] = segments;
      expect(outer.fromRadius).toBeLessThan(BARREL_DRUM.wallInner);
      expect(inner.toRadius).toBeGreaterThan(MAINSPRING.arborRadiusMm);
      expect(coil.sweep).toBeGreaterThan(0);
      expect(inner.sweep, `inner tail at ${reserve} h`).toBeGreaterThan(0);
    });
  });

  it('packs the coil against the arbor side when wound and against the wall when run down', () => {
    const wound = mainspringSegments(42, windingAngles(42).arbor)[1];
    const empty = mainspringSegments(0, windingAngles(0).arbor)[1];
    expect(wound.toRadius).toBeLessThan(empty.toRadius);
    expect(wound.fromRadius).toBeLessThan(empty.fromRadius);
    expect(wound.sweep).toBeGreaterThan(empty.sweep);
  });
});
