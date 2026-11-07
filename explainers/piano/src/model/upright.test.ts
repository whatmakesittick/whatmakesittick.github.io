import { describe, expect, it } from 'vitest';
import { BLOW_MM, CHECK_MM, DAMPER_LIFT_MAX_MM } from './constants';
import { hammerAt } from './action';
import { MOMENTS } from './timing';
import { uprightPoseAt, uprightRestOffsetMm } from './upright';

const DIGITS = 6;

describe('upright ghost', () => {
  it('reaches its strings at the same moment as the grand', () => {
    const pose = uprightPoseAt(MOMENTS.strike, 'medium', 'none', 'middle');
    expect(pose.hammerToStringMm).toBe(0);
    expect(pose.contact).toBe(true);
  });

  it('starts closer and travels half as far with its soft pedal', () => {
    expect(uprightRestOffsetMm('unaCorda')).toBe(BLOW_MM / 2);
    const rest = uprightPoseAt(0, 'medium', 'unaCorda', 'middle');
    expect(rest.hammerToStringMm).toBe(BLOW_MM / 2);
    const before = uprightPoseAt(MOMENTS.letOff, 'medium', 'unaCorda', 'middle');
    const normal = uprightPoseAt(MOMENTS.letOff, 'medium', 'none', 'middle');
    expect(before.hammerToStringMm).toBeCloseTo(normal.hammerToStringMm / 2, DIGITS);
  });

  it('resets its jack only near the top of the key rise', () => {
    expect(uprightPoseAt(MOMENTS.repeatReady, 'medium', 'none', 'middle').jackEscape).toBe(1);
    expect(uprightPoseAt(MOMENTS.damped, 'medium', 'none', 'middle').jackEscape).toBeCloseTo(
      1,
      DIGITS,
    );
    expect(uprightPoseAt(995, 'medium', 'none', 'middle').jackEscape).toBeLessThan(1);
  });

  it('lifts its damper once the hammer is halfway, and holds it with sustain', () => {
    const early = uprightPoseAt(100, 'hard', 'none', 'middle');
    expect(hammerAt(100, 'hard', 'middle').riseMm).toBeLessThan(BLOW_MM / 2);
    expect(early.damperLiftMm).toBe(0);
    expect(uprightPoseAt(700, 'hard', 'none', 'middle').damperLiftMm).toBe(DAMPER_LIFT_MAX_MM);
    expect(uprightPoseAt(0, 'hard', 'sustain', 'middle').damperLiftMm).toBe(DAMPER_LIFT_MAX_MM);
    expect(uprightPoseAt(700, 'hard', 'none', 'treble').damperLiftMm).toBe(0);
  });

  it('follows the key home without a repetition lift', () => {
    const ready = uprightPoseAt(MOMENTS.repeatReady, 'medium', 'none', 'middle');
    expect(ready.hammerTravelMm).toBeLessThanOrEqual(BLOW_MM - CHECK_MM.medium);
  });
});
