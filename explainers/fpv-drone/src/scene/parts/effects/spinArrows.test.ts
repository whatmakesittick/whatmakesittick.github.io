import { describe, expect, it } from 'vitest';
import { SPIN_ARROWS } from '../../constants';
import { arrowBrightness, motorNumber } from './spinArrows';

describe('spin arrows', () => {
  it('numbers the motors in the Betaflight order', () => {
    expect(motorNumber('motorRearRight')).toBe(1);
    expect(motorNumber('motorFrontRight')).toBe(2);
    expect(motorNumber('motorRearLeft')).toBe(3);
    expect(motorNumber('motorFrontLeft')).toBe(4);
  });

  it('brightens the arrows of the motors that work harder', () => {
    const even = arrowBrightness([0.25, 0.25, 0.25, 0.25]);
    expect(new Set(even).size).toBe(1);
    expect(even[0]).toBeCloseTo(SPIN_ARROWS.brightness.base);
    const forward = arrowBrightness([0.3, 0.2, 0.3, 0.2]);
    expect(forward[0]).toBeGreaterThan(forward[1]);
    expect(forward[2]).toBeGreaterThan(forward[3]);
    expect(Math.max(...forward)).toBeLessThanOrEqual(1);
    expect(Math.min(...forward)).toBeGreaterThanOrEqual(SPIN_ARROWS.brightness.min);
  });
});
