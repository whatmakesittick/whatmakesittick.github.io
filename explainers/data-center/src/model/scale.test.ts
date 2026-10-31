import { describe, expect, it } from 'vitest';
import { KW_PER_MW, kwToMw, metres, mm } from './scale';

describe('scale', () => {
  it('draws one world unit as one metre', () => {
    expect(metres(2.24)).toBe(2.24);
  });

  it('turns millimetres into metres', () => {
    expect(mm(1068)).toBeCloseTo(1.068, 12);
    expect(mm(600)).toBeCloseTo(0.6, 12);
  });

  it('turns the 120 kW rack into 0.12 MW', () => {
    expect(KW_PER_MW).toBe(1000);
    expect(kwToMw(120)).toBeCloseTo(0.12, 12);
    expect(kwToMw(23040)).toBeCloseTo(23.04, 9);
  });
});
