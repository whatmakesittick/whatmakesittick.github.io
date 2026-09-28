import { describe, expect, it } from 'vitest';
import { BLADE_COUNTS, HUMAN_BLADE_COUNT } from '../../model/rotor';
import { C_RING } from '../../model/scale';
import { ringLayout } from './ringLayout';

function helixSpacing(bladeCount: number): number {
  return (2 * Math.PI * ringLayout(bladeCount).outerHelixCentre) / bladeCount;
}

describe('ring layout', () => {
  it('matches the measured human ring', () => {
    const human = ringLayout(HUMAN_BLADE_COUNT);
    expect(human.outerRadius).toBeCloseTo(C_RING.outerRadius);
    expect(human.innerRadius).toBeCloseTo(C_RING.innerRadius);
    expect(human.growth).toBeCloseTo(0);
  });

  it('keeps the blades the same size, so a ring with more blades grows', () => {
    const counts = Object.values(BLADE_COUNTS).sort((a, b) => a - b);
    counts.forEach((count) => expect(helixSpacing(count)).toBeCloseTo(helixSpacing(counts[0])));
    const radii = counts.map((count) => ringLayout(count).outerRadius);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(ringLayout(BLADE_COUNTS.chloroplast).growth).toBeGreaterThan(1);
  });

  it('seats the carboxyl dot on the outside of every blade', () => {
    const layout = ringLayout(BLADE_COUNTS.yeast);
    expect(layout.carboxylRadius).toBeLessThan(layout.outerRadius);
    expect(layout.carboxylRadius).toBeGreaterThan(layout.outerHelixCentre);
  });
});
