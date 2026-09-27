import { describe, expect, it } from 'vitest';
import { FABRIC_BOTTOM, FABRIC_TOP, stitchProfile } from './fabric';
import type { Tension } from './fabric';

const PRECISION = 6;

function knot(tension: Tension): number {
  const { topDip, bobbinRise } = stitchProfile(tension);
  return (topDip + bobbinRise) / 2;
}

describe('stitchProfile', () => {
  it('hides the knot in the middle of the fabric when balanced', () => {
    expect(knot('balanced')).toBeCloseTo((FABRIC_BOTTOM + FABRIC_TOP) / 2, PRECISION);
  });

  it('pulls the knot up to the top surface with too much top tension', () => {
    expect(knot('tight')).toBeGreaterThan(FABRIC_TOP);
  });

  it('leaves the knot underneath with too little top tension', () => {
    expect(knot('loose')).toBeLessThan(FABRIC_BOTTOM);
  });

  it('locks the two threads inside the fabric when balanced', () => {
    const profile = stitchProfile('balanced');
    expect(profile.topDip).toBeGreaterThan(profile.bottomLevel);
    expect(profile.bobbinRise).toBeLessThan(profile.topLevel);
    expect(profile.bobbinRise).toBeGreaterThan(profile.topDip);
  });

  it('brings the bobbin thread up to the top surface when too tight', () => {
    const profile = stitchProfile('tight');
    expect(profile.bobbinRise).toBeGreaterThan(profile.topLevel);
  });

  it('lets the top thread show underneath when too loose', () => {
    const profile = stitchProfile('loose');
    expect(profile.topDip).toBeLessThan(profile.bottomLevel);
  });
});
