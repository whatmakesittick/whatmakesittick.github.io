import { describe, expect, it } from 'vitest';
import { thrustShare } from './thrust';

describe('thrust', () => {
  it('is the full takeoff setting at full lever', () => {
    expect(thrustShare(1, 0)).toBeCloseTo(1);
  });

  it('rises with the lever', () => {
    expect(thrustShare(0.8, 0)).toBeGreaterThan(thrustShare(0.3, 0));
  });

  it('goes negative when the reverser is deployed', () => {
    expect(thrustShare(0.6, 1)).toBeLessThan(0);
  });
});
