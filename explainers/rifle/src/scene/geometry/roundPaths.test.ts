import { describe, expect, it } from 'vitest';
import { CARRIER_STROKE, EJECTOR_X, FREE_TRAVEL, MAGAZINE } from '../../model/layout';
import { boltTravel, casePose, feedPose, stackCount, stackPose } from './roundPaths';

describe('round paths', () => {
  it('stacks the rounds in two alternating columns that sink and tilt down the magazine', () => {
    const top = stackPose(0);
    const next = stackPose(1);
    expect(Math.sign(top.base[2])).toBe(-Math.sign(next.base[2]));
    expect(next.base[1]).toBeLessThan(top.base[1]);
    expect(next.tilt).toBeGreaterThan(top.tilt);
    expect(stackCount()).toBeGreaterThan(15);
    expect(stackCount()).toBeLessThanOrEqual(MAGAZINE.rounds);
  });

  it('waits on the magazine until the bolt face reaches the round', () => {
    const top = stackPose(0);
    const early = feedPose(0.2, CARRIER_STROKE);
    expect(early.base).toEqual(top.base);
    expect(early.chambered).toBe(false);
  });

  it('rides the bolt face into the chamber and ends on the bore axis', () => {
    const midway = feedPose(0.6, 60 + FREE_TRAVEL);
    expect(midway.base[0]).toBeCloseTo(-60);
    const home = feedPose(1, 0);
    expect(home.base).toEqual([0, 0, 0]);
    expect(home.tilt).toBeCloseTo(0);
    expect(home.chambered).toBe(true);
  });

  it('throws the case out to the right, up a little and then down', () => {
    expect(casePose(0).base).toEqual([EJECTOR_X, 0, 0]);
    const peak = casePose(0.35);
    const end = casePose(1);
    expect(peak.base[1]).toBeGreaterThan(15);
    expect(end.base[1]).toBeLessThan(0);
    expect(end.base[2]).toBeGreaterThan(100);
    expect(end.base[0]).toBeGreaterThan(EJECTOR_X);
  });

  it('starts the bolt after the free travel of the carrier', () => {
    expect(boltTravel(FREE_TRAVEL)).toBe(0);
    expect(boltTravel(FREE_TRAVEL + 10)).toBe(10);
  });
});
