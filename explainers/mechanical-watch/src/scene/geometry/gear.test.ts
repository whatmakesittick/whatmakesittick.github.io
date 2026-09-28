import { describe, expect, it } from 'vitest';
import {
  formProfile,
  gearModule,
  gearProfile,
  halfThickness,
  sawProfile,
  toothPitch,
} from './gear';
import type { Vec2 } from './outline';
import { signedArea } from './outline';

const radius = (point: Vec2) => Math.hypot(point.x, point.y);
const TEETH = 80;
const PITCH_RADIUS = 6;
const ADDENDUM = 0.165;
const DEDENDUM = 0.23;

describe('gear profile', () => {
  const profile = gearProfile(TEETH, PITCH_RADIUS, ADDENDUM, DEDENDUM, 20);

  it('reaches the tip circle and the root circle', () => {
    const radii = profile.map(radius);
    expect(Math.max(...radii)).toBeCloseTo(PITCH_RADIUS + ADDENDUM, 6);
    expect(Math.min(...radii)).toBeCloseTo(PITCH_RADIUS - DEDENDUM, 6);
  });

  it('repeats one tooth shape around the wheel', () => {
    const perTooth = profile.length / TEETH;
    expect(Number.isInteger(perTooth)).toBe(true);
    const turn = toothPitch(TEETH);
    const first = profile[3];
    const next = profile[3 + perTooth];
    expect(next.x).toBeCloseTo(first.x * Math.cos(turn) - first.y * Math.sin(turn), 6);
    expect(next.y).toBeCloseTo(first.x * Math.sin(turn) + first.y * Math.cos(turn), 6);
  });

  it('winds counter-clockwise', () => {
    expect(signedArea(profile)).toBeGreaterThan(0);
  });

  it('thins a tooth from the pitch circle to the tip', () => {
    const thickness = halfThickness(TEETH, PITCH_RADIUS, 20, 0.5);
    expect(thickness(PITCH_RADIUS)).toBeCloseTo(Math.PI / 2 / TEETH);
    expect(thickness(PITCH_RADIUS + ADDENDUM)).toBeLessThan(thickness(PITCH_RADIUS));
  });

  it('uses the module 2r/N for a tooth form', () => {
    expect(gearModule(TEETH, PITCH_RADIUS)).toBeCloseTo(0.15);
    const pinion = formProfile(10, 0.75, { addendum: 1, dedendum: 1, share: 0.4, pressureDeg: 20 });
    const radii = pinion.map(radius);
    expect(Math.max(...radii)).toBeCloseTo(0.9, 6);
    expect(Math.min(...radii)).toBeCloseTo(0.6, 6);
  });
  it('mirrors saw teeth so the steep faces stay on the requested angles', () => {
    const form = { depth: 0.28, hook: 0, land: 0.14 };
    const offset = 0.2;
    const mirrored = sawProfile(60, 4.5, form, offset, -1);
    expect(signedArea(mirrored)).toBeGreaterThan(0);
    const tips = mirrored.filter((point) => radius(point) > 4.6);
    const angles = tips.map((point) => Math.atan2(point.y, point.x));
    expect(angles.some((angle) => Math.abs(Math.cos(angle - offset) - 1) < 1e-9)).toBe(true);
  });

  it('draws saw teeth between their root and tip circles', () => {
    const saw = sawProfile(60, 4.5, { depth: 0.28, hook: 0.05, land: 0.14 });
    expect(saw).toHaveLength(180);
    const radii = saw.map(radius);
    expect(Math.max(...radii)).toBeCloseTo(4.64, 6);
    expect(Math.min(...radii)).toBeCloseTo(4.36, 6);
  });
});
