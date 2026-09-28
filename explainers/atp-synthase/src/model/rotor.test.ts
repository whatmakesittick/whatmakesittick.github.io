import { describe, expect, it } from 'vitest';
import { slowMotionFactor } from '@core/playback';
import { BETA_INDICES, SITE_STATES } from '../ids';
import {
  ATP_PER_TURN,
  BETA_AZIMUTH_DEG,
  HUMAN_BLADE_COUNT,
  PICKUP_AZIMUTH_DEG,
  RELEASE_AZIMUTH_DEG,
  REAL_TIME_SPEED,
  STEP_DEG,
  atpMade,
  axleBulgeAzimuth,
  bladeAzimuth,
  betaInState,
  degreesPerSecond,
  enteringProgress,
  flowClock,
  isCarrying,
  lapCountAfter,
  leavingProgress,
  protonsPerAtp,
  protonsThrough,
  siteMotion,
  siteState,
  stepIndex,
  stepProgress,
} from './rotor';

describe('rotor steps', () => {
  it('makes one ATP every 120 degrees', () => {
    expect(STEP_DEG).toBe(120);
    expect(stepIndex(0)).toBe(0);
    expect(stepIndex(119.9)).toBe(0);
    expect(stepIndex(120)).toBe(1);
    expect(stepIndex(359.9)).toBe(2);
    expect(stepIndex(360)).toBe(0);
    expect(stepProgress(60)).toBeCloseTo(0.5);
    expect(stepProgress(300)).toBeCloseTo(0.5);
  });

  it('counts three ATP and eight protons per human lap', () => {
    expect(atpMade(0, 1)).toBe(ATP_PER_TURN);
    expect(atpMade(240, 2)).toBe(8);
    expect(protonsThrough(0, 1, HUMAN_BLADE_COUNT)).toBe(8);
    expect(protonsThrough(90, 0, HUMAN_BLADE_COUNT)).toBe(2);
    expect(protonsThrough(90, 0, 10)).toBe(2);
    expect(protonsPerAtp(HUMAN_BLADE_COUNT)).toBeCloseTo(2.667, 3);
  });

  it('runs at 100 turns a second in real time and halves per speed step', () => {
    expect(degreesPerSecond(REAL_TIME_SPEED)).toBe(36_000);
    expect(degreesPerSecond(REAL_TIME_SPEED - 1)).toBe(18_000);
    expect(slowMotionFactor(0, REAL_TIME_SPEED)).toBe(1024);
    expect(slowMotionFactor(REAL_TIME_SPEED, REAL_TIME_SPEED)).toBe(1);
  });
});

describe('binding change', () => {
  it('starts with β0 open, β1 tight and β2 loose, one state each', () => {
    expect(siteState(0, 0)).toBe('open');
    expect(siteState(1, 0)).toBe('tight');
    expect(siteState(2, 0)).toBe('loose');
    SITE_STATES.forEach((state) => {
      expect(BETA_INDICES.filter((beta) => siteState(beta, 45) === state)).toHaveLength(1);
    });
  });

  it('moves every β one state on per step: open, loose, tight, open', () => {
    expect(siteState(0, 120)).toBe('loose');
    expect(siteState(0, 240)).toBe('tight');
    expect(siteState(1, 120)).toBe('open');
    expect(siteState(2, 120)).toBe('tight');
    expect(siteMotion(1, 60)).toEqual({ from: 'tight', to: 'open', progress: 0.5 });
  });

  it('points the axle bulge at the open β, which moves counterclockwise', () => {
    [0, 120, 240].forEach((rotor) => {
      const open = betaInState('open', rotor);
      expect(axleBulgeAzimuth(rotor)).toBeCloseTo(BETA_AZIMUTH_DEG[open]);
    });
    expect(BETA_AZIMUTH_DEG[1] - BETA_AZIMUTH_DEG[0]).toBe(STEP_DEG);
  });
});

describe('proton path', () => {
  it('releases before it picks up in the direction of rotation', () => {
    expect(RELEASE_AZIMUTH_DEG).toBeLessThan(PICKUP_AZIMUTH_DEG);
    expect(isCarrying(RELEASE_AZIMUTH_DEG - 1)).toBe(true);
    expect(isCarrying(RELEASE_AZIMUTH_DEG)).toBe(false);
    expect(isCarrying(PICKUP_AZIMUTH_DEG - 1)).toBe(false);
    expect(isCarrying(PICKUP_AZIMUTH_DEG)).toBe(true);
  });

  it('keeps all but one human blade loaded, so a proton rides almost a full turn', () => {
    const loaded = Array.from({ length: HUMAN_BLADE_COUNT }, (_, blade) =>
      isCarrying(bladeAzimuth(blade, 10, HUMAN_BLADE_COUNT)),
    ).filter(Boolean);
    expect(loaded).toHaveLength(HUMAN_BLADE_COUNT - 1);
  });

  it('moves a leaving proton out just after release and an entering one in just before pickup', () => {
    expect(leavingProgress(RELEASE_AZIMUTH_DEG)).toBe(0);
    expect(leavingProgress(RELEASE_AZIMUTH_DEG - 1)).toBeNull();
    expect(leavingProgress(RELEASE_AZIMUTH_DEG + 10)).toBeCloseTo(0.5);
    expect(enteringProgress(PICKUP_AZIMUTH_DEG - 10)).toBeCloseTo(0.5);
    expect(enteringProgress(PICKUP_AZIMUTH_DEG)).toBeNull();
  });
});

describe('laps', () => {
  it('counts a lap when the rotor wraps forward and removes one when it wraps back', () => {
    expect(lapCountAfter(350, 5, 2)).toBe(3);
    expect(lapCountAfter(5, 350, 2)).toBe(1);
    expect(lapCountAfter(100, 130, 2)).toBe(2);
    expect(flowClock(90, 2)).toBe(810);
  });
});
