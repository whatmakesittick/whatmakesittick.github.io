import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { GAIT_DATA } from './gaitData';
import {
  PACES,
  cadenceAt,
  formatPaceKm,
  stepLengthM,
  strideLengthM,
  strideTimeS,
  timingAt,
} from './paces';

describe('paces', () => {
  it('uses the dataset speeds and cadence', () => {
    expect(PACE_IDS.map((pace) => PACES[pace].speedMs)).toEqual([2.5, 3.5, 4.5]);
    expect(PACE_IDS.map((pace) => Math.round(PACES[pace].cadence))).toEqual([161, 170, 180]);
    expect(PACE_IDS.map((pace) => PACES[pace].toeOffPercent)).toEqual([40.5, 36.3, 34]);
    expect(PACE_IDS.map((pace) => PACES[pace].peakForceBW)).toEqual([2.3, 2.51, 2.61]);
  });

  it('matches the measured step and stride lengths', () => {
    expect(PACE_IDS.map((pace) => Number(stepLengthM(pace, 0).toFixed(2)))).toEqual([
      0.93, 1.23, 1.5,
    ]);
    expect(PACE_IDS.map((pace) => Number(strideLengthM(pace, 0).toFixed(2)))).toEqual([
      1.87, 2.47, 3,
    ]);
    expect(PACE_IDS.map((pace) => Number(strideTimeS(pace, 0).toFixed(3)))).toEqual([
      0.747, 0.705, 0.667,
    ]);
  });

  it('keeps speed equal to step rate times step length for every step rate', () => {
    PACE_IDS.forEach((pace) => {
      [-10, -5, 0, 5, 10].forEach((stepRate) => {
        const speed = (cadenceAt(pace, stepRate) / 60) * stepLengthM(pace, stepRate);
        expect(speed).toBeCloseTo(PACES[pace].speedMs, 9);
      });
    });
  });

  it('computes the contact and float times from the toe-off share', () => {
    const contact = PACE_IDS.map((pace) => Number(timingAt(pace, 0).contactTimeS.toFixed(3)));
    expect(contact).toEqual([0.302, 0.256, 0.227]);
    const flight = PACE_IDS.map((pace) => Number(timingAt(pace, 0).flightTimeS.toFixed(3)));
    expect(flight).toEqual([0.071, 0.097, 0.107]);
    const share = PACE_IDS.map((pace) => Math.round(timingAt(pace, 0).floatShare * 100));
    expect(share).toEqual([19, 27, 32]);
  });

  it('scales contact and stride time together with the step rate', () => {
    const base = timingAt('steady', 0);
    const quick = timingAt('steady', 10);
    expect(quick.contactTimeS / base.contactTimeS).toBeCloseTo(
      quick.strideTimeS / base.strideTimeS,
      9,
    );
    expect(quick.stepLengthM).toBeLessThan(base.stepLengthM);
    expect(quick.speedMs).toBe(base.speedMs);
  });

  it('formats the pace per kilometre', () => {
    expect(PACE_IDS.map((pace) => formatPaceKm(PACES[pace].speedMs))).toEqual([
      '6:40',
      '4:46',
      '3:42',
    ]);
  });

  it('records the number of runners', () => {
    expect(PACE_IDS.map((pace) => GAIT_DATA[pace].n)).toEqual([31, 39, 31]);
  });
});
