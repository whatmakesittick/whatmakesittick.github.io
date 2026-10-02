import { describe, expect, it } from 'vitest';
import { MASS_G } from './figures';
import {
  PAYLOAD_RANGE,
  USABLE_ENERGY_WH,
  allUpG,
  flightMinutes,
  hoverSpeedShare,
  hoverThrustShare,
  thrustToWeight,
} from './payload';

describe('payload', () => {
  it('slides from nothing to one and a half kilos starting at the default load', () => {
    expect(PAYLOAD_RANGE).toEqual({ min: 0, max: 1500, step: 50, default: 300 });
  });

  it('weighs the dry frame, the battery and the payload together', () => {
    expect(allUpG(0)).toBe(1100);
    expect(allUpG(MASS_G.defaultPayload)).toBe(1400);
  });

  it('gives about 5.7 to 1 thrust to weight at the default load, hovering near 18 % thrust', () => {
    expect(thrustToWeight(MASS_G.defaultPayload)).toBeCloseTo(5.71, 2);
    expect(thrustToWeight(0)).toBeCloseTo(7.27, 2);
    expect(hoverThrustShare(MASS_G.defaultPayload)).toBeCloseTo(0.175, 3);
    expect(hoverSpeedShare(MASS_G.defaultPayload)).toBeCloseTo(0.418, 3);
  });

  it('flies about twelve minutes at the default load and less with more weight', () => {
    expect(USABLE_ENERGY_WH).toBeCloseTo(72.8, 9);
    const minutes = flightMinutes(MASS_G.defaultPayload);
    expect(minutes).toBeGreaterThan(11.5);
    expect(minutes).toBeLessThan(14);
    expect(flightMinutes(0)).toBeGreaterThan(minutes);
    expect(flightMinutes(PAYLOAD_RANGE.max)).toBeLessThan(minutes);
    expect(flightMinutes(PAYLOAD_RANGE.max)).toBeGreaterThan(0);
  });

  it('cannot fly once thrust to weight falls under 1.2', () => {
    expect(flightMinutes(6000)).toBe(0);
  });
});
