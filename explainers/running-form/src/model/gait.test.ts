import { describe, expect, it } from 'vitest';
import type { GaitReading, LegReading } from '../ids';
import { PACE_IDS } from '../ids';
import { gaitAt } from './gait';
import type { GaitOptions } from './gait';
import { GAIT_DATA } from './gaitData';
import { upperAt } from './upper';

const OPTIONS: GaitOptions = { pace: 'steady', stepRate: 0, arms: 'swing' };
const SAMPLE_UNITS = Array.from({ length: 100 }, (_, index) => index * 10 + 3);
const LEG_KEYS = [
  'hipFlexDeg',
  'hipAddDeg',
  'hipRotDeg',
  'kneeFlexDeg',
  'kneeAddDeg',
  'kneeRotDeg',
  'ankleDorsiDeg',
  'ankleInvDeg',
  'ankleRotDeg',
] as const satisfies readonly (keyof LegReading)[];

function atPace(pace: GaitOptions['pace'], stepRate = 0): GaitOptions {
  return { ...OPTIONS, pace, stepRate };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function expectSameLeg(a: LegReading, b: LegReading): void {
  LEG_KEYS.forEach((key) => expect(a[key]).toBeCloseTo(b[key], 6));
  expect(a.phase).toBe(b.phase);
  expect(a.contact).toBe(b.contact);
  expect(a.force.vertBW).toBeCloseTo(b.force.vertBW, 6);
}

describe('gait reading', () => {
  it('is periodic in one cycle', () => {
    PACE_IDS.forEach((pace) => {
      SAMPLE_UNITS.forEach((units) => {
        const first = gaitAt(units, atPace(pace));
        const next = gaitAt(units + 1000, atPace(pace));
        expectSameLeg(first.right, next.right);
        expect(first.com.heightM).toBeCloseTo(next.com.heightM, 9);
        expect(first.upper.leanDeg).toBeCloseTo(next.upper.leanDeg, 9);
      });
    });
  });

  it('runs the left leg half a cycle behind the right', () => {
    PACE_IDS.forEach((pace) => {
      SAMPLE_UNITS.forEach((units) => {
        expectSameLeg(gaitAt(units, atPace(pace)).left, gaitAt(units + 500, atPace(pace)).right);
      });
    });
  });

  it('matches the dataset at touchdown', () => {
    const first = gaitAt(0, OPTIONS).right;
    expect(first.kneeFlexDeg).toBeGreaterThan(8);
    expect(first.kneeFlexDeg).toBeLessThan(16);
    expect(first.hipFlexDeg).toBeGreaterThan(34);
    expect(first.hipFlexDeg).toBeLessThan(42);
    expect(first.contact).toBe(true);
    expect(first.stanceShare).toBe(0);
    expect(first.roadTravelM).toBe(0);
  });

  it('flags contact and floats from the toe-off units', () => {
    PACE_IDS.forEach((pace) => {
      const { toeOffUnits } = GAIT_DATA[pace];
      expect(gaitAt(toeOffUnits - 1, atPace(pace)).right.contact).toBe(true);
      expect(gaitAt(toeOffUnits, atPace(pace)).right.contact).toBe(false);
      expect(gaitAt(toeOffUnits, atPace(pace)).float).toBe(1);
      expect(gaitAt(499, atPace(pace)).float).toBe(1);
      expect(gaitAt(500, atPace(pace)).left.contact).toBe(true);
      expect(gaitAt(500 + toeOffUnits, atPace(pace)).float).toBe(2);
      expect(gaitAt(999, atPace(pace)).float).toBe(2);
      expect(gaitAt(100, atPace(pace)).float).toBe(0);
      expect(gaitAt(100, atPace(pace)).force.onFoot).toBe('right');
      expect(gaitAt(600, atPace(pace)).force.onFoot).toBe('left');
      expect(gaitAt(toeOffUnits + 20, atPace(pace)).force.onFoot).toBeNull();
    });
  });

  it('tracks the road travel of the stance foot', () => {
    const reading = gaitAt(180, OPTIONS);
    expect(reading.right.roadTravelM).toBeCloseTo((reading.timing.strideLengthM * 180) / 1000, 9);
    expect(gaitAt(500, OPTIONS).left.roadTravelM).toBe(0);
    expect(gaitAt(500, OPTIONS).right.roadTravelM).toBeNull();
  });

  it('keeps the mean vertical force near one body weight', () => {
    PACE_IDS.forEach((pace) => {
      const forces = Array.from(
        { length: 100 },
        (_, index) => gaitAt(index * 10, atPace(pace)).force.vertBW,
      );
      expect(mean(forces)).toBeGreaterThan(0.97);
      expect(mean(forces)).toBeLessThan(1.0);
    });
  });

  it('reaches the measured peak force and braking', () => {
    PACE_IDS.forEach((pace) => {
      const data = GAIT_DATA[pace];
      expect(gaitAt(data.forcePeakUnits, atPace(pace)).force.vertBW).toBeCloseTo(
        data.peakVerticalBW,
        1,
      );
      expect(gaitAt(data.brakingPeakUnits, atPace(pace)).force.fwdBW).toBeCloseTo(
        -data.peakBrakingBW,
        1,
      );
      expect(gaitAt(data.midStanceUnits - 10, atPace(pace)).force.fwdBW).toBeLessThan(0);
      expect(gaitAt(data.midStanceUnits + 10, atPace(pace)).force.fwdBW).toBeGreaterThanOrEqual(0);
    });
  });

  it('scales the braking and the vertical force with the step rate', () => {
    const base = gaitAt(100, OPTIONS).force;
    const quick = gaitAt(100, atPace('steady', 10)).force;
    const slow = gaitAt(100, atPace('steady', -10)).force;
    expect(quick.fwdBW / base.fwdBW).toBeCloseTo(0.839 * 1.1, 2);
    expect(slow.fwdBW / base.fwdBW).toBeCloseTo(1.25 * 0.9, 2);
    expect(quick.vertBW).toBeLessThan(base.vertBW);
  });

  it('keeps the bounce close to the measured one at each pace', () => {
    const expected = { easy: 8.2, steady: 8.0, fast: 7.4 };
    PACE_IDS.forEach((pace) => {
      const rise = gaitAt(0, atPace(pace)).com.risePeakToPeakM * 100;
      expect(rise).toBeCloseTo(expected[pace], 0);
      expect(rise).toBeGreaterThan(7.0);
      expect(rise).toBeLessThan(10.0);
    });
  });

  it('changes the bounce with the step rate as the study measured', () => {
    PACE_IDS.forEach((pace) => {
      const base = gaitAt(0, atPace(pace)).com.risePeakToPeakM;
      const quick = gaitAt(0, atPace(pace, 10)).com.risePeakToPeakM / base - 1;
      const slow = gaitAt(0, atPace(pace, -10)).com.risePeakToPeakM / base - 1;
      expect(Math.abs(quick * 100 - -16)).toBeLessThan(3);
      expect(Math.abs(slow * 100 - 23)).toBeLessThan(3);
    });
  });

  it('puts the lowest point of the body near 40 percent of the stance', () => {
    PACE_IDS.forEach((pace) => {
      const { toeOffUnits } = GAIT_DATA[pace];
      const heights = Array.from(
        { length: 100 },
        (_, index) => gaitAt(index * 10, atPace(pace)).com.heightM,
      );
      const lowest = heights.indexOf(Math.min(...heights)) * 10;
      const step = lowest % 500;
      expect(Math.abs(step - 0.4 * toeOffUnits)).toBeLessThan(30);
    });
  });

  it('keeps the surge of the body to a few centimetres', () => {
    PACE_IDS.forEach((pace) => {
      const { surgePeakToPeakM, speedSwingMs } = gaitAt(0, atPace(pace)).com;
      expect(surgePeakToPeakM * 100).toBeGreaterThan(0.8);
      expect(surgePeakToPeakM * 100).toBeLessThan(1.6);
      expect(speedSwingMs).toBeGreaterThan(0.1);
      expect(speedSwingMs).toBeLessThan(0.3);
    });
  });

  it('puts the highest point of the body in a float', () => {
    PACE_IDS.forEach((pace) => {
      const heights = Array.from(
        { length: 100 },
        (_, index) => gaitAt(index * 10, atPace(pace)).com.heightM,
      );
      const highest = heights.indexOf(Math.max(...heights)) * 10;
      expect(gaitAt(highest, atPace(pace)).float).not.toBe(0);
    });
  });

  it('reports the timing of the pace', () => {
    const timing = gaitAt(0, OPTIONS).timing;
    expect(timing.cadence).toBeCloseTo(170.2, 1);
    expect(timing.speedMs).toBe(3.5);
    expect(timing.stepLengthM).toBeCloseTo(1.23, 2);
    expect(timing.dutyFactor).toBeCloseTo(0.363, 3);
  });

  it('gives a landing reach that responds to the step rate', () => {
    expect(gaitAt(0, atPace('steady', 10)).landing.reachM).toBeLessThan(
      gaitAt(0, OPTIONS).landing.reachM,
    );
    expect(gaitAt(0, atPace('steady', -10)).landing.reachM).toBeGreaterThan(
      gaitAt(0, OPTIONS).landing.reachM,
    );
  });

  it('bends the knee less in the landing at a higher step rate', () => {
    const peak = (stepRate: number): number =>
      gaitAt(150, atPace('steady', stepRate)).right.kneeFlexDeg;
    expect(peak(10) - peak(0)).toBeCloseTo(-3.5, 0);
    expect(peak(-10) - peak(0)).toBeCloseTo(4.3, 0);
  });
});

describe('upper body', () => {
  it('leans 7 degrees on average with a swing of the sourced size', () => {
    const leans = Array.from(
      { length: 100 },
      (_, index) => upperAt(index * 10, 'steady', 'swing').leanDeg,
    );
    expect(mean(leans)).toBeCloseTo(7.3, 1);
    expect(Math.max(...leans) - Math.min(...leans)).toBeCloseTo(7.1, 1);
  });

  it('keeps the head level', () => {
    SAMPLE_UNITS.forEach((units) => {
      const reading = upperAt(units, 'fast', 'swing');
      expect(reading.headPitchDeg + reading.leanDeg).toBeCloseTo(0, 9);
    });
  });

  it('sizes the pelvis and chest turns from the dataset', () => {
    const range = (
      pick: (r: GaitReading['upper']) => number,
      pace: 'easy' | 'steady' | 'fast',
    ): number => {
      const values = Array.from({ length: 100 }, (_, index) =>
        pick(upperAt(index * 10, pace, 'swing')),
      );
      return Math.max(...values) - Math.min(...values);
    };
    expect(range((r) => r.pelvisRotDeg, 'steady')).toBeCloseTo(12, 1);
    expect(range((r) => r.trunkTwistDeg, 'steady')).toBeCloseTo(25, 1);
    expect(range((r) => r.pelvisTiltDeg, 'fast')).toBeCloseTo(7, 1);
    expect(range((r) => r.pelvisRollDeg, 'easy')).toBeGreaterThan(9);
  });

  it('turns the chest against the pelvis', () => {
    SAMPLE_UNITS.forEach((units) => {
      const reading = upperAt(units, 'steady', 'swing');
      expect(reading.pelvisRotDeg * reading.trunkTwistDeg).toBeLessThanOrEqual(0);
      expect(reading.shoulderRotDeg).toBeCloseTo(reading.pelvisRotDeg + reading.trunkTwistDeg, 9);
    });
  });

  it('swings each arm against the opposite leg', () => {
    const forward = gaitAt(480, OPTIONS);
    expect(forward.upper.shoulderFlexDeg.right).toBeGreaterThan(0);
    expect(forward.upper.shoulderFlexDeg.left).toBeLessThan(0);
    const other = gaitAt(980, OPTIONS);
    expect(other.upper.shoulderFlexDeg.left).toBeGreaterThan(0);
  });

  it('holds the arms across the chest and twists the chest more', () => {
    const swing = upperAt(0, 'steady', 'swing');
    const held = upperAt(0, 'steady', 'held');
    expect(held.holdsArms).toBe(true);
    expect(held.shoulderFlexDeg).toEqual({ right: 0, left: 0 });
    expect(held.elbowDeg).toEqual({ right: 100, left: 100 });
    expect(Math.abs(held.trunkTwistDeg / swing.trunkTwistDeg)).toBeCloseTo(1.68, 2);
    expect(Math.abs(held.shoulderRotDeg)).toBeGreaterThan(Math.abs(swing.shoulderRotDeg));
  });

  it('alternates the pelvic drop between the steps', () => {
    expect(upperAt(125, 'steady', 'swing').pelvisRollDeg).toBeGreaterThan(0);
    expect(upperAt(625, 'steady', 'swing').pelvisRollDeg).toBeLessThan(0);
    expect(upperAt(499.9, 'steady', 'swing').pelvisRollDeg).toBeCloseTo(
      upperAt(500, 'steady', 'swing').pelvisRollDeg,
      1,
    );
  });
});
