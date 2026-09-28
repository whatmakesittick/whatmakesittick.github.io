import { describe, expect, it } from 'vitest';
import type { Vec2 } from './outline';
import { signedArea } from './outline';
import { clubToothProfile, crossingHoles, leanOffset } from './wheel';
import type { ClubToothForm } from './wheel';

const FORM: ClubToothForm = {
  tipRadius: 2.425,
  rootRadius: 1.9,
  heelDrop: 0.09,
  clubDeg: 5.5,
  leanDeg: 22,
  backDeg: 15,
};
const radius = (point: Vec2) => Math.hypot(point.x, point.y);
const FILLET_TOLERANCE = 0.01;

describe('club tooth wheel', () => {
  const teeth = 20;
  const offset = 0.3;
  const profile = clubToothProfile(teeth, FORM, offset);

  it('puts every locking corner on the tip circle at its tooth angle', () => {
    const perTooth = profile.length / teeth;
    for (let tooth = 0; tooth < teeth; tooth += 1) {
      const corner = profile[tooth * perTooth + 1];
      expect(radius(corner)).toBeCloseTo(FORM.tipRadius, 6);
      const expected = offset + (tooth * Math.PI * 2) / teeth;
      expect(Math.cos(Math.atan2(corner.y, corner.x) - expected)).toBeCloseTo(1, 6);
    }
  });

  it('leans the locking face back from the corner', () => {
    expect(leanOffset(FORM)).toBeGreaterThan(0);
  });

  it('stays between the root and tip circles and winds counter-clockwise', () => {
    const radii = profile.map(radius);
    expect(Math.max(...radii)).toBeCloseTo(FORM.tipRadius, 6);
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(FORM.rootRadius - 1e-6);
    expect(signedArea(profile)).toBeGreaterThan(0);
  });
});

describe('crossings', () => {
  it('opens one window between each pair of spokes inside the rim', () => {
    const style = {
      spokes: 5,
      rimInner: 3,
      hubRadius: 0.6,
      spokeWidth: 0.3,
      fillet: 0.1,
      offset: 0,
    };
    const holes = crossingHoles(style, 120);
    expect(holes).toHaveLength(5);
    holes.flat().forEach((point) => {
      expect(radius(point)).toBeLessThanOrEqual(style.rimInner + 1e-6);
      expect(radius(point)).toBeGreaterThanOrEqual(style.hubRadius - FILLET_TOLERANCE);
    });
  });
});
