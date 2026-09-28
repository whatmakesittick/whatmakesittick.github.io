import { describe, expect, it } from 'vitest';
import { WHEEL_IDS } from '../ids';
import {
  ARBOR_TURNS_FULL_WIND,
  BEATS_PER_HOUR,
  MOTION_WORKS,
  OSCILLATIONS_PER_SECOND,
  POWER_RESERVE_HOURS,
  TRAIN,
  WINDING,
  barrelHoursPerTurn,
  beatsPerHour,
  crownTurnsForFullWind,
  motionWorksRatio,
  secondsPerTurn,
  stepUp,
  turnsPerHour,
  wheelSpec,
} from './train';

describe('the going train', () => {
  it('lists the wheels in driving order', () => {
    expect(TRAIN.map((wheel) => wheel.id)).toEqual([...WHEEL_IDS]);
  });

  it('turns the centre wheel once an hour and the fourth wheel once a minute', () => {
    expect(turnsPerHour('centreWheel')).toBeCloseTo(1);
    expect(secondsPerTurn('fourthWheel')).toBeCloseTo(60);
  });

  it('beats 28,800 times an hour', () => {
    expect(beatsPerHour()).toBeCloseTo(BEATS_PER_HOUR);
    expect(OSCILLATIONS_PER_SECOND).toBeCloseTo(4);
  });

  it('gears up at every mesh', () => {
    for (const wheel of TRAIN.slice(1)) {
      expect(stepUp(wheel.id)).toBeGreaterThan(1);
    }
  });

  it('alternates the sense of rotation', () => {
    for (let i = 1; i < TRAIN.length; i += 1) {
      expect(TRAIN[i].sense).toBe(-TRAIN[i - 1].sense);
    }
    expect(wheelSpec('centreWheel').sense).toBe(1);
  });

  it('empties the barrel in the power reserve', () => {
    expect(barrelHoursPerTurn() * ARBOR_TURNS_FULL_WIND).toBeCloseTo(POWER_RESERVE_HOURS);
    expect(ARBOR_TURNS_FULL_WIND).toBeCloseTo(5.25);
  });

  it('turns the escape wheel twelve times a minute with twenty teeth', () => {
    expect(secondsPerTurn('escapeWheel')).toBeCloseTo(5);
  });

  it('keeps meshing pairs at the same module', () => {
    for (let i = 1; i < TRAIN.length; i += 1) {
      const driver = TRAIN[i - 1];
      const driven = TRAIN[i];
      const wheelModule = (2 * driver.radiusMm) / driver.teeth;
      const pinionModule = (2 * driven.pinionRadiusMm) / driven.pinionLeaves;
      expect(pinionModule).toBeCloseTo(wheelModule, 2);
    }
  });
});

describe('the motion works', () => {
  it('reduces twelve to one', () => {
    expect(motionWorksRatio()).toBe(12);
  });

  it('shares one centre distance between both meshes', () => {
    const { cannonPinion, minuteWheel, hourWheel } = MOTION_WORKS;
    const first = cannonPinion.radiusMm + minuteWheel.radiusMm;
    const second = minuteWheel.pinionRadiusMm + hourWheel.radiusMm;
    expect(second).toBeCloseTo(first, 6);
  });
});

describe('the winding train', () => {
  it('turns the crown wheel twice per arbor turn', () => {
    expect(WINDING.ratchetTeeth / WINDING.crownWheelTeeth).toBe(2);
  });

  it('needs about twenty-six crown turns for a full wind', () => {
    expect(crownTurnsForFullWind()).toBeGreaterThan(23);
    expect(crownTurnsForFullWind()).toBeLessThan(30);
  });
});
