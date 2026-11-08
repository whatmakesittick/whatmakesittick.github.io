import { describe, expect, it } from 'vitest';
import { COMPARE_IDS, PEDAL_IDS, REGISTER_IDS, TOUCH_IDS } from '../ids';
import type { RegisterId, TouchId } from '../ids';
import { DAMPER_LEAVE_KEY_MM, STRIKE_MS } from './constants';
import { keyMmAt } from './action';
import { MOMENTS, realMsAt, unitsAt } from './timing';
import { t60For } from './tone';
import {
  COMPARE,
  COMPARE_ROW_IDS,
  damperLeadMs,
  decaySeconds,
  dropHeightCm,
  freeFlightMs,
  keySpeedAtLetOff,
  stretchCents,
  touchTimeMs,
} from './chapters';

function byTouch(read: (touch: TouchId) => number): readonly number[] {
  return TOUCH_IDS.map(read);
}

function byRegister(read: (register: RegisterId) => number): readonly number[] {
  return REGISTER_IDS.map(read);
}

function rounded(values: readonly number[], digits = 0): readonly number[] {
  const scale = 10 ** digits;
  return values.map((value) => Math.round(value * scale) / scale);
}

describe('chapter readouts', () => {
  it('takes 160, 67 and 36 ms from finger to string', () => {
    expect(byTouch(touchTimeMs)).toEqual([160, 67, 36]);
    expect(byTouch(touchTimeMs)).toEqual(TOUCH_IDS.map((touch) => STRIKE_MS[touch]));
  });

  it('hits like a fall from 5, 14 and 127 cm', () => {
    expect(rounded(byTouch(dropHeightCm))).toEqual([5, 14, 127]);
  });

  it('moves the key at 0.18, 0.30 and 0.91 m/s at let-off', () => {
    expect(rounded(byTouch(keySpeedAtLetOff), 2)).toEqual([0.18, 0.3, 0.91]);
  });

  it('flies the hammer free for 1.5, 0.91 and 0.3 ms', () => {
    expect(rounded(byTouch(freeFlightMs), 2)).toEqual([1.5, 0.91, 0.3]);
  });

  it('flies free between the let-off and the strike', () => {
    TOUCH_IDS.forEach((touch) => {
      const flight =
        realMsAt(MOMENTS.strike, touch, 'middle') - realMsAt(MOMENTS.letOff, touch, 'middle');
      expect(freeFlightMs(touch), touch).toBeCloseTo(flight, 9);
    });
  });

  it('lifts the damper 73.6, 39.6 and 15.2 ms before the strike', () => {
    expect(rounded(byTouch(damperLeadMs), 1)).toEqual([73.6, 39.6, 15.2]);
  });

  it('lifts the damper when the key passes its first millimetre', () => {
    TOUCH_IDS.forEach((touch) => {
      const leaveMs = touchTimeMs(touch) - damperLeadMs(touch);
      const units = unitsAt(leaveMs, touch, 'middle');
      expect(keyMmAt(units, touch, 'middle'), touch).toBeCloseTo(DAMPER_LEAVE_KEY_MM, 6);
    });
  });

  it('stretches the reference partial by 2, 18 and 84 cents', () => {
    expect(rounded(byRegister(stretchCents))).toEqual([2, 18, 84]);
  });

  it('fades by 60 dB in the measured times, with and without sustain', () => {
    expect(byRegister((register) => decaySeconds('none', register))).toEqual([20.3, 9.5, 12]);
    expect(byRegister((register) => decaySeconds('sustain', register))).toEqual([18.1, 15.3, 12]);
    PEDAL_IDS.forEach((pedal) =>
      REGISTER_IDS.forEach((register) =>
        expect(decaySeconds(pedal, register)).toBe(t60For(pedal, register)),
      ),
    );
  });

  it('names a locale key for every comparison cell', () => {
    expect(Object.keys(COMPARE)).toEqual([...COMPARE_ROW_IDS]);
    COMPARE_ROW_IDS.forEach((row) => {
      expect(Object.keys(COMPARE[row])).toEqual([...COMPARE_IDS]);
      COMPARE_IDS.forEach((id) =>
        expect(COMPARE[row][id]).toBe(`chapters.compare.${row}Value.${id}`),
      );
    });
  });
});
