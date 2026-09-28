import { describe, expect, it } from 'vitest';
import {
  AM15G_SPECTRUM,
  AM15G_TOTAL_W_M2,
  BAND_GAP_NM,
  SPECTRUM_END_NM,
  SPECTRUM_SHARES,
  SPECTRUM_START_NM,
  absorbedShare,
  absorptionDepthUm,
  bandOf,
  excessEnergyEv,
  pairsPerSecond,
  passesThrough,
  photonEnergyEv,
  spectralShare,
  wavelengthColor,
} from './optics';

describe('photon energy', () => {
  it('matches the facts sheet at three wavelengths', () => {
    expect(photonEnergyEv(400)).toBeCloseTo(3.1, 1);
    expect(photonEnergyEv(600)).toBeCloseTo(2.07, 2);
    expect(photonEnergyEv(1000)).toBeCloseTo(1.24, 2);
  });

  it('puts the band edge near eleven hundred nanometres', () => {
    expect(BAND_GAP_NM).toBeGreaterThan(1100);
    expect(BAND_GAP_NM).toBeLessThan(1110);
    expect(excessEnergyEv(600)).toBeCloseTo(0.95, 2);
    expect(excessEnergyEv(1200)).toBe(0);
    expect(passesThrough(1200)).toBe(true);
    expect(passesThrough(1000)).toBe(false);
  });
});

describe('absorption depth', () => {
  it('reproduces the tabled depths and interpolates between them', () => {
    expect(absorptionDepthUm(400)).toBeCloseTo(0.105);
    expect(absorptionDepthUm(600)).toBeCloseTo(2.4);
    expect(absorptionDepthUm(1000)).toBeCloseTo(156);
    const between = absorptionDepthUm(700);
    expect(between).toBeGreaterThan(4.5);
    expect(between).toBeLessThan(11.8);
    expect(absorptionDepthUm(200)).toBeCloseTo(0.006);
    expect(absorptionDepthUm(1300)).toBeCloseTo(2900);
  });

  it('absorbs blue in a thin wafer and lets infrared past the band gap through', () => {
    expect(absorbedShare(400, 140)).toBeCloseTo(1, 3);
    expect(absorbedShare(1000, 140)).toBeGreaterThan(0.5);
    expect(absorbedShare(1000, 140)).toBeLessThan(0.7);
    expect(absorbedShare(1200, 140)).toBe(0);
  });
});

describe('AM1.5G spectrum', () => {
  it('covers three hundred to fourteen hundred nanometres in twenty nanometre steps', () => {
    expect(SPECTRUM_START_NM).toBe(300);
    expect(SPECTRUM_END_NM).toBe(1400);
    expect(AM15G_SPECTRUM.length).toBe(55);
  });

  it('integrates to about eighty nine percent of the whole spectrum', () => {
    expect(spectralShare(SPECTRUM_START_NM, SPECTRUM_END_NM)).toBeCloseTo(0.89, 2);
  });

  it('reproduces the facts sheet band shares', () => {
    expect(spectralShare(400, 700)).toBeCloseTo(SPECTRUM_SHARES.visible, 2);
    expect(spectralShare(700, 1100)).toBeCloseTo(SPECTRUM_SHARES.nearInfrared, 1);
    expect(AM15G_TOTAL_W_M2).toBeCloseTo(1000.4);
  });
});

describe('bands and colours', () => {
  it('names the band of a wavelength', () => {
    expect(bandOf(350)).toBe('ultraviolet');
    expect(bandOf(470)).toBe('blue');
    expect(bandOf(600)).toBe('orange');
    expect(bandOf(900)).toBe('nearInfrared');
    expect(bandOf(1200)).toBe('infrared');
  });

  it('gives a blue tint at 470 nm, a red at 650 nm and a dull rust beyond the gap', () => {
    const [, , blue] = wavelengthColor(470);
    expect(blue).toBeGreaterThan(0.9);
    const [red, green] = wavelengthColor(650);
    expect(red).toBeGreaterThan(0.9);
    expect(green).toBeLessThan(0.4);
    const infrared = wavelengthColor(1300);
    expect(infrared[0]).toBeLessThan(0.5);
    infrared.forEach((channel) => {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    });
  });
});

describe('pairsPerSecond', () => {
  it('turns the half cell short-circuit current into about four times ten to the nineteen', () => {
    expect(pairsPerSecond(7.03) / 1e19).toBeCloseTo(4.4, 1);
  });
});
