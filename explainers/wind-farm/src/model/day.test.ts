import { describe, expect, it } from 'vitest';
import { PHASE_IDS, SITE_WIND_IDS } from '../ids';
import {
  CYCLE_MINUTES,
  PHASE_RANGES,
  WIND_PRESETS,
  clockOf,
  dayWind,
  phaseOf,
  rate,
  windFromDeg,
  wrapMinute,
} from './day';

describe('day phases', () => {
  it('covers the whole day with ranges that follow each other', () => {
    expect(CYCLE_MINUTES).toBe(1440);
    expect(PHASE_RANGES[PHASE_IDS[0]][0]).toBe(0);
    expect(PHASE_RANGES[PHASE_IDS[PHASE_IDS.length - 1]][1]).toBe(CYCLE_MINUTES);
    PHASE_IDS.slice(1).forEach((id, index) => {
      expect(PHASE_RANGES[id][0]).toBe(PHASE_RANGES[PHASE_IDS[index]][1]);
    });
  });

  it('switches phase exactly at each boundary', () => {
    expect(phaseOf(0)).toBe('night');
    expect(phaseOf(359)).toBe('night');
    expect(phaseOf(360)).toBe('morning');
    expect(phaseOf(1147)).toBe('storm');
    expect(phaseOf(1148)).toBe('evening');
    expect(phaseOf(1440)).toBe('night');
  });

  it('wraps minutes into one day', () => {
    expect(wrapMinute(1500)).toBe(60);
    expect(wrapMinute(-60)).toBe(1380);
  });
});

describe('clockOf', () => {
  it('prints the minute as a 24 hour clock', () => {
    expect(clockOf(0)).toBe('00:00');
    expect(clockOf(1035)).toBe('17:15');
    expect(clockOf(1440)).toBe('00:00');
    expect(clockOf(-5)).toBe('23:55');
  });
});

describe('dayWind', () => {
  it('scales the base wind by the site', () => {
    expect(dayWind(600, 'typical')).toBeCloseTo(9, 9);
    expect(dayWind(600, 'calm')).toBeCloseTo(7.2, 9);
    expect(dayWind(600, 'windy')).toBeCloseTo(10.35, 9);
    expect(dayWind(960, 'calm')).toBeCloseTo(14.4, 9);
  });

  it('blows 26 m/s at every site in the storm core', () => {
    SITE_WIND_IDS.forEach((site) => {
      expect(dayWind(1050, site)).toBeCloseTo(26, 9);
    });
  });

  it('joins the end of the day to its start', () => {
    SITE_WIND_IDS.forEach((site) => {
      expect(dayWind(CYCLE_MINUTES, site)).toBeCloseTo(dayWind(0, site), 9);
    });
  });
});

describe('windFromDeg', () => {
  it('veers 6 degrees either side of west through the day', () => {
    expect(windFromDeg(0)).toBeCloseTo(270, 9);
    expect(windFromDeg(360)).toBeCloseTo(276, 9);
    expect(windFromDeg(1080)).toBeCloseTo(264, 9);
  });
});

describe('rate', () => {
  it('turns the speed multiplier into clock minutes per second', () => {
    expect(rate(12)).toBe(12);
  });
});

describe('WIND_PRESETS', () => {
  it('pins the wind speeds of the five presets', () => {
    expect(WIND_PRESETS).toEqual({ cutIn: 3, peak: 8, rated: 12, rampDown: 23, cutOut: 25 });
  });
});
