import { describe, expect, it } from 'vitest';
import { BRAKE_MODE_IDS, TOP_SPEED_IDS } from '../ids';
import { CONVERTER_MAX_HZ, LINE_M, RECORD_KMH } from './constants';
import { SECTION_COUNT, SECTION_M, TRAIN } from './layout';
import { fieldWavelength, sectionAt, statorHz, waveAt } from './motor';
import { motionAt } from './motion';
import { toMs } from './scale';

const BOUNDARY_STEP = 1e-6;
const LAST_SECTION = SECTION_COUNT - 1;
const STANDING_UNITS = [0, 30, 59, 940, 970, 1000];
const ACCELERATE_UNITS = 200;
const CRUISE_UNITS = 500;
const BRAKE_UNITS = 700;
const MODE_CASES = TOP_SPEED_IDS.flatMap((topSpeed) =>
  BRAKE_MODE_IDS.map((brakeMode) => [topSpeed, brakeMode] as const),
);

describe('statorHz', () => {
  it('runs the field at 231.5 Hz at 430 km/h and 161.5 Hz at 300 km/h', () => {
    expect(statorHz(toMs(430))).toBeCloseTo(231.5, 1);
    expect(statorHz(toMs(300))).toBeCloseTo(161.5, 1);
  });

  it('needs 269.7 Hz for the 501 km/h record, inside the converter limit', () => {
    expect(statorHz(toMs(RECORD_KMH))).toBeCloseTo(269.7, 1);
    expect(statorHz(toMs(RECORD_KMH))).toBeLessThan(CONVERTER_MAX_HZ);
  });

  it('is zero when the train stands', () => {
    expect(statorHz(0)).toBe(0);
  });
});

describe('fieldWavelength', () => {
  it('spans two pole pitches, 0.516 m', () => {
    expect(fieldWavelength()).toBeCloseTo(0.516, 9);
  });
});

describe('sectionAt', () => {
  it('starts in the first section with no handover at the platform', () => {
    expect(sectionAt(0)).toEqual({ index: 0, nextIndex: null, start: 0, end: SECTION_M });
  });

  it('powers the next section once the nose crosses into it', () => {
    const handover = SECTION_M - TRAIN.noseX;
    expect(sectionAt(handover - BOUNDARY_STEP).nextIndex).toBeNull();
    expect(sectionAt(handover + BOUNDARY_STEP)).toEqual({
      index: 0,
      nextIndex: 1,
      start: 0,
      end: SECTION_M,
    });
  });

  it('hands over the middle at the section boundary', () => {
    expect(sectionAt(SECTION_M - BOUNDARY_STEP)).toMatchObject({ index: 0, nextIndex: 1 });
    expect(sectionAt(SECTION_M)).toEqual({
      index: 1,
      nextIndex: null,
      start: SECTION_M,
      end: 2 * SECTION_M,
    });
  });

  it('ends in the last section with no section after it', () => {
    const lastStart = LAST_SECTION * SECTION_M;
    const expected = { index: LAST_SECTION, nextIndex: null, start: lastStart, end: LINE_M };
    expect(sectionAt(LINE_M)).toEqual(expected);
    expect(sectionAt(LINE_M - TRAIN.noseX + 1)).toEqual(expected);
  });

  it('clamps positions outside the line to the end sections', () => {
    expect(sectionAt(-TRAIN.noseX).index).toBe(0);
    expect(sectionAt(LINE_M + SECTION_M).index).toBe(LAST_SECTION);
  });
});

describe('waveAt', () => {
  it.each(MODE_CASES)('is off while the train stands (%s, %s)', (topSpeed, brakeMode) => {
    STANDING_UNITS.forEach((units) => {
      expect(waveAt(units, topSpeed, brakeMode).on).toBe(false);
    });
  });

  it.each(BRAKE_MODE_IDS)('drives forward while speeding up and cruising (%s)', (brakeMode) => {
    [ACCELERATE_UNITS, CRUISE_UNITS].forEach((units) => {
      expect(waveAt(units, 'kmh430', brakeMode)).toMatchObject({ on: true, reversed: false });
    });
  });

  it('runs reversed while braking with regen', () => {
    expect(waveAt(BRAKE_UNITS, 'kmh430', 'regen')).toMatchObject({ on: true, reversed: true });
  });

  it('is off while the eddy brake stops the train', () => {
    expect(waveAt(BRAKE_UNITS, 'kmh430', 'eddy')).toMatchObject({ on: false, reversed: false });
  });

  it('follows the train speed', () => {
    expect(waveAt(CRUISE_UNITS, 'kmh430', 'regen').hz).toBeCloseTo(231.5, 1);
    expect(waveAt(CRUISE_UNITS, 'kmh300', 'regen').hz).toBeCloseTo(161.5, 1);
    const { speedMs } = motionAt(ACCELERATE_UNITS, 'kmh430', 'regen');
    expect(waveAt(ACCELERATE_UNITS, 'kmh430', 'regen').hz).toBeCloseTo(statorHz(speedMs), 9);
  });

  it('keeps the section under the train even when the wave is off', () => {
    const { distance } = motionAt(BRAKE_UNITS, 'kmh430', 'eddy');
    const section = sectionAt(distance);
    expect(waveAt(BRAKE_UNITS, 'kmh430', 'eddy')).toMatchObject({
      sectionIndex: section.index,
      nextSectionIndex: section.nextIndex,
      sectionStart: section.start,
      sectionEnd: section.end,
    });
    expect(waveAt(0, 'kmh430', 'regen')).toMatchObject({ sectionIndex: 0, sectionStart: 0 });
    expect(waveAt(1000, 'kmh430', 'regen')).toMatchObject({
      sectionIndex: LAST_SECTION,
      sectionEnd: LINE_M,
    });
  });
});
