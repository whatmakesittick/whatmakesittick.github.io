import { describe, expect, it } from 'vitest';
import { TOUCH_IDS } from '../ids';
import { HARPSICHORD_PLUCK_SHARE, PLUCK_RELEASE_MM, PLUCK_START_MM } from './constants';
import { harpsichordDampedMs, harpsichordPoseAt, pluckMs } from './harpsichord';
import { MOMENTS, realMsAt, unitsAt } from './timing';

const DIGITS = 6;
const JUST_AFTER_MS = 1e-6;

describe('harpsichord ghost', () => {
  it('rests with its damper on the string', () => {
    const rest = harpsichordPoseAt(0, 'medium', 'middle');
    expect(rest.damperOn).toBe(true);
    expect(rest.plucked).toBe(false);
    expect(rest.stringShare).toBe(0);
  });

  it('plucks the same for every touch', () => {
    const shares = TOUCH_IDS.map((touch) => {
      const units = unitsAt(pluckMs(touch) + JUST_AFTER_MS, touch, 'middle');
      return harpsichordPoseAt(units, touch, 'middle').stringShare;
    });
    shares.forEach((share) => expect(share).toBeCloseTo(HARPSICHORD_PLUCK_SHARE, DIGITS));
  });

  it('bends the string between the pluck points and lets go at the second', () => {
    const halfway = (PLUCK_START_MM + PLUCK_RELEASE_MM) / 2;
    let units = 0;
    while (harpsichordPoseAt(units, 'soft', 'middle').jackRiseMm < halfway) units += 0.1;
    const pose = harpsichordPoseAt(units, 'soft', 'middle');
    expect(pose.plectrumBend).toBeGreaterThan(0);
    expect(pose.plectrumBend).toBeLessThan(1);
    expect(pose.plucked).toBe(false);
  });

  it('fades while held and goes quiet when the jack falls back', () => {
    const held = harpsichordPoseAt(MOMENTS.checked, 'medium', 'middle');
    expect(held.plucked).toBe(true);
    expect(held.stringShare).toBeLessThan(HARPSICHORD_PLUCK_SHARE);
    const after = unitsAt(harpsichordDampedMs('medium', 'middle') + 1, 'medium', 'middle');
    const damped = harpsichordPoseAt(after, 'medium', 'middle');
    expect(damped.damperOn).toBe(true);
    expect(damped.stringShare).toBe(0);
    expect(realMsAt(after, 'medium', 'middle')).toBeGreaterThan(
      harpsichordDampedMs('medium', 'middle'),
    );
  });
});
