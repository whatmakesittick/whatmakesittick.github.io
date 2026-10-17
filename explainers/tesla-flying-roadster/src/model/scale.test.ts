import { describe, expect, it } from 'vitest';
import { metres, toKmh } from './scale';

describe('scale', () => {
  it('draws one world unit as one metre', () => {
    expect(metres(2.825)).toBe(2.825);
  });

  it('converts the ramp entry speed to km/h', () => {
    expect(toKmh(16)).toBeCloseTo(57.6, 9);
  });
});
