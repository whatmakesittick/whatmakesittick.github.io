import { describe, expect, it } from 'vitest';
import { CENTRE_TIME, FLASH_INTERVAL_S, HORIZON_TIME } from '../../model';
import { BEACON } from '../constants';
import { arrivalFade, beaconPulseShare, pulseTint, pulsesInFlight } from './beaconPulses';

describe('beacon pulses', () => {
  it('emits a pulse every flash interval and drops the ones past the ship', () => {
    expect(pulsesInFlight(0)).toEqual([{ emittedAt: 0, travelled: 0, ratio: expect.any(Number) }]);
    const pulses = pulsesInFlight(25);
    expect(pulses.map((pulse) => pulse.emittedAt)).toEqual([20, 10, 0]);
    expect(pulses.map((pulse) => pulse.travelled)).toEqual([5, 15, 25]);
    expect(pulsesInFlight(100).length).toBeLessThanOrEqual(BEACON.maxPath / FLASH_INTERVAL_S + 1);
    expect(pulsesInFlight(CENTRE_TIME).length).toBeLessThanOrEqual(BEACON.maxPulses);
  });

  it('reddens each pulse with the clock ratio at its emission', () => {
    const early = pulsesInFlight(5)[0];
    const late = pulsesInFlight(HORIZON_TIME - 1)[0];
    expect(early.ratio).toBeLessThan(late.ratio);
    expect(pulseTint(1).share).toBe(0);
    expect(pulseTint(1).alpha).toBe(1);
    expect(pulseTint(BEACON.redRatio).share).toBe(1);
    expect(pulseTint(BEACON.goneRatio).alpha).toBe(0);
    expect(pulseTint(Infinity).alpha).toBe(0);
    expect(pulseTint(Infinity).share).toBe(1);
  });

  it('fades a pulse as it reaches the ship', () => {
    expect(arrivalFade(0, 15)).toBe(1);
    expect(arrivalFade(15, 15)).toBe(0);
    expect(arrivalFade(14, 15)).toBeGreaterThan(0);
    expect(arrivalFade(1, 0)).toBe(0);
  });

  it('gives the beacon a share of its flash cycle', () => {
    expect(beaconPulseShare(0)).toBe(0);
    expect(beaconPulseShare(2.5)).toBeCloseTo(0.25, 9);
    expect(beaconPulseShare(FLASH_INTERVAL_S)).toBe(0);
  });
});
