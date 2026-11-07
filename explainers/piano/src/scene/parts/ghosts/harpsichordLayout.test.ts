import { describe, expect, it } from 'vitest';
import { FULL_TURN } from '@core/math';
import type { HarpsichordPose } from '../../../ids';
import {
  HARPSICHORD,
  HARPSICHORD_JACK_RATIO,
  HARPSICHORD_PLUCK_SHARE,
  KEY,
  PLUCK_RELEASE_MM,
  PLUCK_START_MM,
  mm,
} from '../../../model';
import { turnAbout } from './shapes';
import {
  DAMPER_BOTTOM,
  JACK,
  KEY_PIVOT,
  PLECTRUM,
  RING,
  STRING,
  harpsichordKeyAngle,
  plectrumAngle,
  ringPhase,
  stringLift,
} from './harpsichordLayout';

const DIGITS = 9;
const NEAR = 4;
const KEY_MM = 6;
const MIDDLE = 0.5;
const STILL: HarpsichordPose = {
  keyMm: 0,
  jackRiseMm: 0,
  plectrumBend: 0,
  plucked: false,
  damperOn: true,
  stringShare: 0,
};

describe('harpsichord ghost layout', () => {
  it('dips the key front and lifts the jack end by the jack ratio', () => {
    const angle = harpsichordKeyAngle(KEY_MM);
    const [front] = turnAbout([KEY_PIVOT[0], HARPSICHORD.offsetZ], KEY_PIVOT, angle);
    const [back] = turnAbout([KEY_PIVOT[0], JACK.z], KEY_PIVOT, angle);
    expect(KEY_PIVOT[0] - front).toBeCloseTo(mm(KEY_MM), NEAR);
    expect(back - KEY_PIVOT[0]).toBeCloseTo(mm(KEY_MM * HARPSICHORD_JACK_RATIO), NEAR);
  });

  it('meets the string after the pluck start and frees the damper there', () => {
    const plectrumTop = PLECTRUM.y + PLECTRUM.half;
    const stringBottom = HARPSICHORD.stringY - STRING.radius;
    expect(stringBottom - plectrumTop).toBeCloseTo(mm(PLUCK_START_MM), DIGITS);
    expect(DAMPER_BOTTOM + mm(PLUCK_START_MM)).toBeCloseTo(
      stringBottom + 2 * STRING.radius,
      DIGITS,
    );
    expect(JACK.bottom).toBe(KEY.top);
    expect(plectrumAngle(1)).toBeLessThan(plectrumAngle(0));
  });

  it('pushes the string up at the pluck point and rings it after the release', () => {
    const pluckShare = (JACK.z - STRING.back) / (STRING.front - STRING.back);
    expect(stringLift(MIDDLE, STILL, 0)).toBe(0);
    const bending = { ...STILL, plectrumBend: 1 };
    expect(stringLift(pluckShare, bending, 0)).toBeCloseTo(
      mm(PLUCK_RELEASE_MM - PLUCK_START_MM),
      DIGITS,
    );
    expect(stringLift(0, bending, 0)).toBe(0);
    const ringing = { ...STILL, plucked: true, stringShare: HARPSICHORD_PLUCK_SHARE };
    expect(stringLift(MIDDLE, ringing, 0)).toBeCloseTo(RING.peak, DIGITS);
    expect(stringLift(MIDDLE, ringing, Math.PI)).toBeCloseTo(-RING.peak, DIGITS);
    expect(stringLift(1, ringing, 0)).toBeCloseTo(0, DIGITS);
  });

  it('turns the ring phase at the drawn frequency', () => {
    expect(ringPhase(1 / RING.hz)).toBeCloseTo(FULL_TURN, DIGITS);
  });
});
