import { describe, expect, it } from 'vitest';
import { wrapOffset } from '../../../pose';
import { CONTACT_WIRE_RISE, RAIL } from './constants';
import { CATENARY, RACK_REACH, SLEEPER, TRACK_PERIOD } from './track/constants';
import { evenCentres, sagAt, slotRange, slotsOf } from './track/slots';

const DIGITS = 6;
const OFFSET_SAMPLES = [0, 0.1, 0.5, 0.9, 0.999];

describe('ghost track slots', () => {
  it('covers the reach on both sides at every wrap offset', () => {
    [RACK_REACH.near, RACK_REACH.far].forEach((reach) => {
      const { first, last } = slotRange(reach, TRACK_PERIOD);
      OFFSET_SAMPLES.forEach((share) => {
        const offset = wrapOffset(share * TRACK_PERIOD, TRACK_PERIOD);
        expect(first * TRACK_PERIOD + offset).toBeLessThanOrEqual(-reach);
        expect((last + 1) * TRACK_PERIOD + offset).toBeGreaterThanOrEqual(reach);
      });
    });
  });

  it('leaves the near slots out of the far racks', () => {
    const near = slotRange(RACK_REACH.near, TRACK_PERIOD);
    const far = slotRange(RACK_REACH.far, TRACK_PERIOD);
    const outer = slotsOf(far, near);
    expect(outer.some((slot) => slot >= near.first && slot <= near.last)).toBe(false);
    expect(outer.length + slotsOf(near).length).toBe(slotsOf(far).length);
  });

  it('lays 80 sleepers 0.62 m apart in each 49.6 m period', () => {
    const centres = evenCentres(SLEEPER.perPeriod, TRACK_PERIOD);
    expect(TRACK_PERIOD).toBeCloseTo(49.6, DIGITS);
    expect(centres).toHaveLength(80);
    expect(centres[1] - centres[0]).toBeCloseTo(0.62, DIGITS);
    expect(centres[0] + centres[centres.length - 1]).toBeCloseTo(TRACK_PERIOD, DIGITS);
  });

  it('sags the messenger most in mid span and keeps every dropper above the contact wire', () => {
    expect(sagAt(0, CATENARY.sag)).toBe(0);
    expect(sagAt(1, CATENARY.sag)).toBe(0);
    expect(sagAt(0.5, CATENARY.sag)).toBeCloseTo(CATENARY.sag, DIGITS);
    CATENARY.dropperShares.forEach((share) =>
      expect(CATENARY.messengerY - sagAt(share, CATENARY.sag)).toBeGreaterThan(CATENARY.contactY),
    );
    expect(CATENARY.contactY - RAIL.top).toBeCloseTo(CONTACT_WIRE_RISE, DIGITS);
  });
});
