import { describe, expect, it } from 'vitest';
import { BEAT_RATE_IDS } from '../ids';
import {
  COSC_RATE_BAND,
  activeLengthChangeMm,
  activeLengthMm,
  balanceEnergyMicroJ,
  beatRateFacts,
  dailyRate,
  energyPerBeatMicroJ,
  frequencyHz,
  hairspringLengthMm,
  isWithinCosc,
  periodMs,
} from './timekeeping';

describe('hairspring', () => {
  it('is about 188 mm long over its 12 coils', () => {
    expect(hairspringLengthMm()).toBeCloseTo(188.5, 1);
  });

  it('gets shorter as the index moves toward fast', () => {
    expect(activeLengthChangeMm(1)).toBeCloseTo(-0.61, 2);
    expect(activeLengthChangeMm(-1)).toBeCloseTo(0.61, 2);
    expect(activeLengthMm(0)).toBeCloseTo(hairspringLengthMm());
    expect(activeLengthMm(1)).toBeLessThan(activeLengthMm(0));
  });

  it('stops at the ends of the index', () => {
    expect(activeLengthChangeMm(3)).toBeCloseTo(activeLengthChangeMm(1));
  });
});

describe('daily rate', () => {
  it('keeps time with the index in the middle', () => {
    expect(dailyRate(0)).toBeCloseTo(0);
    expect(periodMs(0)).toBeCloseTo(250);
    expect(frequencyHz(0)).toBeCloseTo(4);
  });

  it('gains about 141 s a day at the fast end and loses as much at the slow end', () => {
    expect(dailyRate(1)).toBeCloseTo(140.8, 0);
    expect(dailyRate(-1)).toBeCloseTo(-140.8, 0);
  });

  it('shortens the swing when the watch gains', () => {
    expect(periodMs(1)).toBeLessThan(250);
    expect(frequencyHz(1)).toBeGreaterThan(4);
    expect(periodMs(-1)).toBeGreaterThan(250);
  });

  it('checks the rate against the chronometer band', () => {
    expect(isWithinCosc(0)).toBe(true);
    expect(isWithinCosc(COSC_RATE_BAND.max)).toBe(true);
    expect(isWithinCosc(COSC_RATE_BAND.min - 0.1)).toBe(false);
    expect(isWithinCosc(dailyRate(0.1))).toBe(false);
  });
});

describe('balance energy', () => {
  it('carries about 12 µJ at 280° and 7.5 µJ at 220°', () => {
    expect(balanceEnergyMicroJ(280)).toBeCloseTo(12.1, 1);
    expect(balanceEnergyMicroJ(220)).toBeCloseTo(7.5, 1);
  });

  it('gets a small top-up each beat', () => {
    expect(energyPerBeatMicroJ()).toBeGreaterThan(0.2);
    expect(energyPerBeatMicroJ()).toBeLessThan(0.3);
    expect(balanceEnergyMicroJ(280) / energyPerBeatMicroJ()).toBeGreaterThan(40);
  });
});

describe('beat rates', () => {
  it('gives 8 beats a second, 691,200 a day and 12 rpm at 28,800 vph', () => {
    expect(beatRateFacts('vph28800')).toEqual({
      vph: 28_800,
      hz: 4,
      beatsPerSecond: 8,
      beatsPerDay: 691_200,
      escapeWheelRpm: 12,
      secondStepsPerSecond: 8,
    });
  });

  it('turns the 20-tooth escape wheel at 7.5, 9, 12 and 15 rpm', () => {
    expect(BEAT_RATE_IDS.map((id) => beatRateFacts(id).escapeWheelRpm)).toEqual([7.5, 9, 12, 15]);
    expect(BEAT_RATE_IDS.map((id) => beatRateFacts(id).beatsPerSecond)).toEqual([5, 6, 8, 10]);
  });
});
