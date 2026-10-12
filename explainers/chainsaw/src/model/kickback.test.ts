import { describe, expect, it } from 'vitest';
import {
  AT_REST,
  GUARD_SWING_SECONDS,
  GUARD_TRIP_SECONDS,
  KICKBACK_SHOW_SECONDS,
  RISE_DEG,
  RISE_SECONDS,
  kickbackPose,
} from './kickback';

describe('kickback', () => {
  it('rests before it starts and after it ends', () => {
    expect(kickbackPose(-0.1)).toEqual(AT_REST);
    expect(kickbackPose(KICKBACK_SHOW_SECONDS)).toEqual(AT_REST);
  });

  it('rises to its full drawn angle and settles back', () => {
    expect(kickbackPose(0).riseDeg).toBe(0);
    expect(kickbackPose(RISE_SECONDS).riseDeg).toBe(RISE_DEG);
    expect(kickbackPose(KICKBACK_SHOW_SECONDS - 0.001).riseDeg).toBeLessThan(0.01);
  });

  it('trips the inertia brake shortly after it starts', () => {
    expect(kickbackPose(GUARD_TRIP_SECONDS - 0.01).tripped).toBe(false);
    expect(kickbackPose(GUARD_TRIP_SECONDS).tripped).toBe(true);
    expect(kickbackPose(GUARD_TRIP_SECONDS + GUARD_SWING_SECONDS).guardForward).toBe(1);
    expect(kickbackPose(1).guardForward).toBe(1);
  });
});
