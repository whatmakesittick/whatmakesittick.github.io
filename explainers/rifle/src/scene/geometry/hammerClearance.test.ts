import { describe, expect, it } from 'vitest';
import { HAMMER, RETARDER_ANGLE } from '../../model/layout';
import { FIRING_PIN } from '../constants';
import { hammerAngle, pinPush } from './hammerClearance';

describe('hammer clearance', () => {
  it('keeps the angle from the model while the bolt is home', () => {
    expect(hammerAngle(0, 0)).toBe(0);
    expect(hammerAngle(RETARDER_ANGLE, 0)).toBe(RETARDER_ANGLE);
  });

  it('lets the bolt push the struck hammer back as it leaves', () => {
    expect(hammerAngle(0, 10)).toBeGreaterThan(0);
    expect(hammerAngle(0, 30)).toBeGreaterThan(hammerAngle(0, 10));
  });

  it('never turns the hammer forward of the angle the model asks for', () => {
    expect(hammerAngle(HAMMER.swing, 60)).toBeGreaterThanOrEqual(HAMMER.swing);
  });

  it('drives the firing pin only when the hammer strikes a locked bolt', () => {
    expect(pinPush(0, 0)).toBeCloseTo(FIRING_PIN.travel);
    expect(pinPush(RETARDER_ANGLE, 0)).toBe(0);
    expect(pinPush(0, 5)).toBe(0);
  });
});
