import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { DEMO_HOVER_SHARE } from '../../../model/motors';
import { DOWNWASH } from '../../constants';
import { downwashLevels, flowRate, wakeBend } from './downwash';
import type { WakeFlight } from './downwash';

const HOVER = [DEMO_HOVER_SHARE, DEMO_HOVER_SHARE, DEMO_HOVER_SHARE, DEMO_HOVER_SHARE] as const;
const CRUISE: WakeFlight = {
  heading: 0,
  pitch: toRadians(30),
  roll: 0,
  speedKmh: 70,
  verticalSpeed: 0,
};

describe('downwash levels', () => {
  it('gives every motor the same level in a steady hover, with room to grow', () => {
    const levels = downwashLevels(HOVER);
    expect(new Set(levels).size).toBe(1);
    expect(levels[0]).toBeGreaterThan(0.5);
    expect(levels[0]).toBeLessThan(1);
  });

  it('makes the motors that speed up push visibly more air', () => {
    const rise = DEMO_HOVER_SHARE * 0.05;
    const levels = downwashLevels([
      DEMO_HOVER_SHARE + rise,
      DEMO_HOVER_SHARE - rise,
      DEMO_HOVER_SHARE + rise,
      DEMO_HOVER_SHARE - rise,
    ]);
    expect(levels[0] / levels[1]).toBeGreaterThan(1.5);
    expect(levels[2]).toBe(levels[0]);
    expect(Math.max(...levels)).toBeLessThanOrEqual(DOWNWASH.level.max);
  });

  it('stills the air when the motors stop', () => {
    expect(downwashLevels([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });
});

describe('wake bend', () => {
  it('leaves the wake straight down in a hover', () => {
    const bend = wakeBend({ ...CRUISE, pitch: 0, speedKmh: 0 }, new Vector3());
    expect(bend.length()).toBeCloseTo(0);
  });

  it('sweeps the wake back toward the tail at cruise, whatever the heading', () => {
    const bend = wakeBend(CRUISE, new Vector3());
    expect(bend.x).toBeLessThan(-DOWNWASH.bend.max * 0.7);
    expect(Math.abs(bend.z)).toBeLessThan(1e-6);
    expect(bend.length()).toBeCloseTo(DOWNWASH.bend.max);
    const turned = wakeBend({ ...CRUISE, heading: Math.PI / 2 }, new Vector3());
    expect(turned.distanceTo(bend)).toBeLessThan(1e-6);
  });

  it('never lifts the wake back up through the props on a descent', () => {
    const bend = wakeBend({ ...CRUISE, pitch: 0, speedKmh: 0, verticalSpeed: -20 }, new Vector3());
    expect(bend.y).toBeLessThanOrEqual(DOWNWASH.bend.rise);
  });
});

describe('downwash flow', () => {
  it('runs the streaks faster through a harder working propeller', () => {
    expect(flowRate(1)).toBeGreaterThan(flowRate(0.5));
    expect(flowRate(0)).toBeGreaterThan(0);
  });
});
