import { describe, expect, it } from 'vitest';
import { ADVANCE_PER_BEAT_DEG, LIFT_ANGLE_DEG } from './escapement';
import {
  ADVANCE_PER_CYCLE_DEG,
  START_TIME_ON_DIAL_S,
  balanceAngle,
  beatProgress,
  contactHalfWidth,
  cycleCountAfter,
  elapsedSeconds,
  escapeWheelAngle,
  forkAngle,
  mainspringCoil,
  momentPhase,
  motionWorksAngles,
  phaseAt,
  phaseRanges,
  timeOnDialSeconds,
  trainAngles,
  wheelAngles,
  windingAngles,
} from './kinematics';
import { MAINSPRING } from './layout';
import { ARBOR_TURNS_FULL_WIND, POWER_RESERVE_HOURS, TRAIN } from './train';

const AMPLITUDE = 290;

describe('balance', () => {
  it('starts each loop at the positive turning point and crosses the centre twice', () => {
    expect(balanceAngle(0, AMPLITUDE)).toBeCloseTo(AMPLITUDE);
    expect(balanceAngle(90, AMPLITUDE)).toBeCloseTo(0);
    expect(balanceAngle(180, AMPLITUDE)).toBeCloseTo(-AMPLITUDE);
    expect(balanceAngle(270, AMPLITUDE)).toBeCloseTo(0);
  });

  it('spends a few degrees of phase in contact', () => {
    const w = contactHalfWidth(AMPLITUDE);
    expect(w).toBeGreaterThan(4);
    expect(w).toBeLessThan(7);
    expect(contactHalfWidth(200)).toBeGreaterThan(w);
  });

  it('tiles the cycle with six phases', () => {
    const ranges = phaseRanges(AMPLITUDE);
    expect(ranges.swingIn.start).toBe(0);
    expect(ranges.swingHome.end).toBe(360);
    expect(ranges.tick.end).toBe(ranges.swingOut.start);
    expect(phaseAt(90, AMPLITUDE)).toBe('tick');
    expect(phaseAt(270, AMPLITUDE)).toBe('tock');
    expect(phaseAt(45, AMPLITUDE)).toBe('swingIn');
    expect(phaseAt(359, AMPLITUDE)).toBe('swingHome');
  });
});

describe('fork', () => {
  it('rests on a banking outside the lift angle', () => {
    expect(forkAngle(LIFT_ANGLE_DEG)).toBeCloseTo(5);
    expect(forkAngle(-LIFT_ANGLE_DEG)).toBeCloseTo(-5);
    expect(forkAngle(0)).toBeCloseTo(0);
  });

  it('runs its progress forward on both beats', () => {
    expect(beatProgress(0, AMPLITUDE)).toBe(0);
    expect(beatProgress(90, AMPLITUDE)).toBeCloseTo(0.5);
    expect(beatProgress(179, AMPLITUDE)).toBe(1);
    expect(beatProgress(181, AMPLITUDE)).toBe(0);
    expect(beatProgress(270, AMPLITUDE)).toBeCloseTo(0.5);
    expect(beatProgress(359, AMPLITUDE)).toBe(1);
  });
});

describe('escape wheel', () => {
  it('advances half a tooth per beat and a whole tooth per cycle', () => {
    expect(escapeWheelAngle(0, 0, AMPLITUDE)).toBeCloseTo(0);
    expect(escapeWheelAngle(179.9, 0, AMPLITUDE)).toBeCloseTo(-ADVANCE_PER_BEAT_DEG);
    expect(escapeWheelAngle(180, 0, AMPLITUDE)).toBeCloseTo(-ADVANCE_PER_BEAT_DEG);
    expect(escapeWheelAngle(359.9, 0, AMPLITUDE)).toBeCloseTo(-ADVANCE_PER_CYCLE_DEG);
    expect(escapeWheelAngle(0, 1, AMPLITUDE)).toBeCloseTo(-ADVANCE_PER_CYCLE_DEG);
  });

  it('never turns backwards through a cycle', () => {
    let previous = 0;
    for (let phase = 0.5; phase < 360; phase += 0.5) {
      const angle = escapeWheelAngle(phase, 0, AMPLITUDE);
      expect(angle).toBeLessThanOrEqual(previous + 1e-9);
      previous = angle;
    }
  });
});

describe('train angles', () => {
  it('turns the centre wheel once an hour', () => {
    const cyclesPerHour = 4 * 3600;
    const angles = wheelAngles(0, cyclesPerHour, AMPLITUDE);
    expect(angles.centreWheel).toBeCloseTo(360, 6);
    expect(angles.fourthWheel).toBeCloseTo(360 * 60, 6);
  });

  it('follows the sense of rotation of each wheel', () => {
    const angles = trainAngles(-360);
    for (const wheel of TRAIN) {
      expect(Math.sign(angles[wheel.id])).toBe(wheel.sense);
    }
  });
});

describe('time on the dial', () => {
  it('counts a quarter of a second per cycle', () => {
    expect(elapsedSeconds(0, 4)).toBeCloseTo(1);
    expect(elapsedSeconds(180, 0)).toBeCloseTo(0.125);
    expect(timeOnDialSeconds(0, 0)).toBe(START_TIME_ON_DIAL_S);
  });

  it('keeps the hour hand at a twelfth of the minute hand rate', () => {
    const before = motionWorksAngles(0, 0);
    const quarterHour = motionWorksAngles(0, 4 * 900);
    expect(quarterHour.minute - before.minute).toBeCloseTo(90);
    expect(quarterHour.hour - before.hour).toBeCloseTo(7.5);
    expect(Math.sign(before.minuteWheel)).toBe(-Math.sign(before.cannonPinion));
  });

  it('steps the seconds hand with the fourth wheel, once per beat', () => {
    const atRest = motionWorksAngles(0, 0, AMPLITUDE);
    const beforeTick = motionWorksAngles(80, 0, AMPLITUDE);
    const afterTick = motionWorksAngles(100, 0, AMPLITUDE);
    const afterCycle = motionWorksAngles(0, 1, AMPLITUDE);
    expect(beforeTick.second - atRest.second).toBeCloseTo(0);
    expect(afterTick.second - atRest.second).toBeCloseTo(0.75);
    expect(afterCycle.second - atRest.second).toBeCloseTo(1.5);
    expect(motionWorksAngles(0, 4 * 60, AMPLITUDE).second - atRest.second).toBeCloseTo(360);
  });

  it('starts the hands at the start time on the dial', () => {
    const hands = motionWorksAngles(0, 0, AMPLITUDE);
    expect(hands.minute).toBeCloseTo((9.5 / 60) * 360);
    expect(hands.hour).toBeCloseTo(((10 + 9.5 / 60) / 12) * 360);
    expect(hands.second).toBeCloseTo(180);
  });
});

describe('winding', () => {
  it('turns the arbor over the reserve and the crown wheel twice as fast', () => {
    const full = windingAngles(POWER_RESERVE_HOURS);
    expect(full.arbor).toBeCloseTo(-ARBOR_TURNS_FULL_WIND * 360);
    expect(Math.sign(full.arbor)).toBe(TRAIN[0].sense);
    expect(Math.abs(full.crownWheel)).toBeCloseTo(2 * Math.abs(full.arbor));
    expect(windingAngles(0).arbor).toBeCloseTo(0);
  });

  it('rests the coil against the wall when run down and pulls it toward the arbor when wound', () => {
    const wound = mainspringCoil(POWER_RESERVE_HOURS);
    const down = mainspringCoil(0);
    expect(down.outerRadiusMm).toBeCloseTo(MAINSPRING.wallRadiusMm);
    expect(wound.innerRadiusMm).toBeGreaterThan(MAINSPRING.arborRadiusMm);
    expect(wound.innerRadiusMm).toBeLessThan(down.innerRadiusMm);
    expect(wound.outerRadiusMm).toBeLessThan(MAINSPRING.wallRadiusMm);
    expect(down.coils).toBeGreaterThan(14);
    expect(wound.coils - down.coils).toBeCloseTo(ARBOR_TURNS_FULL_WIND, 6);
    expect(mainspringCoil(POWER_RESERVE_HOURS / 2).coils - down.coils).toBeLessThan(
      ARBOR_TURNS_FULL_WIND,
    );
  });
});

describe('cycle counting', () => {
  it('counts a wrap forward and a wrap backward', () => {
    expect(cycleCountAfter(359, 1, 5)).toBe(6);
    expect(cycleCountAfter(1, 359, 5)).toBe(4);
    expect(cycleCountAfter(100, 120, 5)).toBe(5);
  });
});

describe('moments', () => {
  it('orders the escapement moments through the tick', () => {
    const phases = ['lock', 'unlock', 'impulse', 'drop', 'free'].map((id) =>
      momentPhase(id as 'lock', AMPLITUDE),
    );
    for (let i = 1; i < phases.length; i += 1) {
      expect(phases[i]).toBeGreaterThan(phases[i - 1]);
    }
    expect(momentPhase('impulse', AMPLITUDE)).toBeCloseTo(90);
  });
});
