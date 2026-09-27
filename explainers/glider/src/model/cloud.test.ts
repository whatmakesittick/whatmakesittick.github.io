import { describe, expect, it } from 'vitest';
import { CUMULUS_BASE, SPREAD, clampSpread, cloudBase, roundedCloudBase } from './cloud';
import { KEYFRAMES } from './story';

describe('cloudBase', () => {
  it('puts the base at 1500 m for a spread of 12 °C', () => {
    expect(cloudBase(12)).toBe(1500);
  });

  it('rises about 125 m for every degree of spread', () => {
    expect(cloudBase(13) - cloudBase(12)).toBe(125);
  });

  it('rounds the readout to 50 m', () => {
    expect(roundedCloudBase(13)).toBe(1650);
    expect(roundedCloudBase(3)).toBe(400);
  });

  it('sits the cumulus where the thermal climb ends', () => {
    expect(CUMULUS_BASE).toBe(KEYFRAMES[1].height);
  });
});

describe('clampSpread', () => {
  it('keeps the spread within the slider range', () => {
    expect(clampSpread(0)).toBe(SPREAD.min);
    expect(clampSpread(40)).toBe(SPREAD.max);
    expect(clampSpread(8)).toBe(8);
  });
});
