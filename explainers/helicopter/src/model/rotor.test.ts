import { describe, expect, it } from 'vitest';
import { FORWARD_SHARE } from './flight';
import {
  BLADE_PITCH_DEGREES,
  CYCLIC_PITCH_DEGREES,
  FORWARD_FLAP_DEGREES,
  FULL_CONING_DEGREES,
  ROTOR,
  bladeAzimuth,
  bladeFlap,
  bladePitch,
  degreesPerSecond,
  normalizeAzimuth,
  rotorHalf,
  tailRotorAngle,
  tipSpeed,
} from './rotor';

const PRECISION = 6;
const HOVER_COLLECTIVE = 0.5;
const HOVER = FORWARD_SHARE.hover;
const FORWARD = FORWARD_SHARE.forward;

describe('tipSpeed', () => {
  it('is zero when the rotor stands still', () => {
    expect(tipSpeed(0)).toBe(0);
  });

  it('covers one circumference per revolution', () => {
    expect(tipSpeed(60, 1)).toBeCloseTo(2 * Math.PI, PRECISION);
  });

  it('reaches about 200 m/s for a five metre rotor at 400 rpm', () => {
    expect(tipSpeed(400, ROTOR.radiusMetres)).toBeCloseTo(209.44, 2);
  });

  it('grows in proportion to rpm', () => {
    expect(tipSpeed(200)).toBeCloseTo(tipSpeed(100) * 2, PRECISION);
  });
});

describe('degreesPerSecond', () => {
  it('turns one full circle per second at 60 rpm', () => {
    expect(degreesPerSecond(60)).toBe(360);
  });
});

describe('normalizeAzimuth', () => {
  it('wraps into one turn', () => {
    expect(normalizeAzimuth(370)).toBe(10);
    expect(normalizeAzimuth(-90)).toBe(270);
  });
});

describe('rotorHalf', () => {
  it('advances over the first half turn and retreats over the second', () => {
    expect(rotorHalf(0)).toBe('advancing');
    expect(rotorHalf(90)).toBe('advancing');
    expect(rotorHalf(180)).toBe('retreating');
    expect(rotorHalf(270)).toBe('retreating');
  });
});

describe('bladeAzimuth', () => {
  it('spaces the blades evenly around the hub', () => {
    const azimuths = Array.from({ length: ROTOR.bladeCount }, (_, blade) =>
      bladeAzimuth(30, blade),
    );
    expect(azimuths).toEqual([30, 120, 210, 300]);
  });
});

describe('bladePitch', () => {
  it('follows the collective alone in a hover', () => {
    [0, 90, 180, 270].forEach((azimuth) =>
      expect(bladePitch(azimuth, 1, HOVER)).toBe(BLADE_PITCH_DEGREES.full),
    );
    expect(bladePitch(45, 0, HOVER)).toBe(BLADE_PITCH_DEGREES.flat);
  });

  it('lowers pitch on the advancing side and raises it on the retreating side', () => {
    const base = bladePitch(0, HOVER_COLLECTIVE, HOVER);
    expect(bladePitch(90, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(
      base - CYCLIC_PITCH_DEGREES,
      PRECISION,
    );
    expect(bladePitch(270, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(
      base + CYCLIC_PITCH_DEGREES,
      PRECISION,
    );
  });

  it('scales the cyclic with the share of forward flight', () => {
    const base = bladePitch(0, HOVER_COLLECTIVE, HOVER);
    expect(bladePitch(90, HOVER_COLLECTIVE, FORWARD / 2)).toBeCloseTo(
      base - CYCLIC_PITCH_DEGREES / 2,
      PRECISION,
    );
  });

  it('leaves pitch unchanged over the nose and the tail', () => {
    const base = bladePitch(0, HOVER_COLLECTIVE, HOVER);
    expect(bladePitch(0, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(base, PRECISION);
    expect(bladePitch(180, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(base, PRECISION);
  });
});

describe('bladeFlap', () => {
  it('cones the blades upward as the collective rises', () => {
    expect(bladeFlap(0, 0, HOVER)).toBe(0);
    expect(bladeFlap(0, 1, HOVER)).toBe(FULL_CONING_DEGREES);
  });

  it('tilts the disc forward in forward flight', () => {
    const coning = bladeFlap(0, HOVER_COLLECTIVE, HOVER);
    expect(bladeFlap(0, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(
      coning + FORWARD_FLAP_DEGREES,
      PRECISION,
    );
    expect(bladeFlap(180, HOVER_COLLECTIVE, FORWARD)).toBeCloseTo(
      coning - FORWARD_FLAP_DEGREES,
      PRECISION,
    );
  });

  it('peaks a quarter turn after the highest pitch', () => {
    const highestPitch = 270;
    const highestFlap = normalizeAzimuth(highestPitch + 90);
    expect(bladeFlap(highestFlap, HOVER_COLLECTIVE, FORWARD)).toBeGreaterThan(
      bladeFlap(highestPitch, HOVER_COLLECTIVE, FORWARD),
    );
  });
});

describe('tailRotorAngle', () => {
  it('turns faster than the main rotor through the gearing', () => {
    expect(tailRotorAngle(10)).toBe(10 * ROTOR.tailGearRatio);
  });

  it('lines up again after every main rotor turn', () => {
    expect(tailRotorAngle(360)).toBe(tailRotorAngle(0));
  });
});
