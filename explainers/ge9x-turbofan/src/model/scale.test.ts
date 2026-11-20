import { describe, expect, it } from 'vitest';
import { ENGINE_LENGTH_M, FAN_DIAMETER_M, LIP_X, NACELLE_DIAMETER_M, xAt } from './scale';

describe('scale', () => {
  it('runs the engine from the lip to the nozzle', () => {
    expect(xAt(0)).toBe(LIP_X);
    expect(xAt(1)).toBeCloseTo(LIP_X + ENGINE_LENGTH_M);
  });

  it('keeps the fan inside the nacelle', () => {
    expect(FAN_DIAMETER_M).toBeLessThan(NACELLE_DIAMETER_M);
  });
});
