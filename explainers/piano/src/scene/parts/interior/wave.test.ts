import { describe, expect, it } from 'vitest';
import { REGISTER_IDS } from '../../../ids';
import { KNOT_UNITS, PLAYED_KEY, stringDirection } from '../../../model';
import { interiorState } from './testState';
import { isRinging, swingFor, unisonAmplitudes, wavePeak } from './wave';

const RINGING = KNOT_UNITS.strike + 20;
const BEFORE_STRIKE = KNOT_UNITS.jackTouch;
const MM = 1000;

describe('string wave', () => {
  it('stays flat without the wave view', () => {
    const state = interiorState(RINGING);
    expect(unisonAmplitudes(state)).toEqual([0, 0, 0]);
    expect(isRinging(state)).toBe(false);
  });

  it('swings a couple of centimetres at the middle for a hard strike', () => {
    const state = interiorState(RINGING, { view: { wave: true } });
    const peak = wavePeak(state) * MM;
    expect(peak).toBeGreaterThan(15);
    expect(peak).toBeLessThan(40);
    expect(isRinging(state)).toBe(true);
  });

  it('leans the swing across the string and keeps it a unit vector', () => {
    REGISTER_IDS.forEach((register) => {
      const [x, y, z] = swingFor(register);
      const [dx, , dz] = stringDirection(PLAYED_KEY[register]);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
      expect(x * dx + z * dz).toBeCloseTo(0, 9);
      expect(y).toBeGreaterThan(0);
    });
  });

  it('scales with the string length and the touch', () => {
    const bass = wavePeak(interiorState(RINGING, { register: 'bass', view: { wave: true } }));
    const treble = wavePeak(interiorState(RINGING, { register: 'treble', view: { wave: true } }));
    const soft = wavePeak(interiorState(RINGING, { touch: 'soft', view: { wave: true } }));
    const hard = wavePeak(interiorState(RINGING, { view: { wave: true } }));
    expect(bass).toBeGreaterThan(hard);
    expect(treble).toBeLessThan(hard);
    expect(soft).toBeLessThan(hard);
  });

  it('moves the unstruck una corda string only weakly', () => {
    const state = interiorState(RINGING, { pedal: 'unaCorda', view: { wave: true } });
    const [left, middle, right] = unisonAmplitudes(state);
    expect(left).toBeLessThan(middle / 2);
    expect(middle).toBeCloseTo(right, 9);
  });

  it('rests before the hammer strikes', () => {
    expect(isRinging(interiorState(BEFORE_STRIKE, { view: { wave: true } }))).toBe(false);
  });
});
