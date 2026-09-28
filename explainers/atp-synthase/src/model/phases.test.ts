import { describe, expect, it } from 'vitest';
import { phaseAt, phaseRange } from './phases';

describe('ATP phases', () => {
  it('splits the lap into three 120° steps, one ATP each', () => {
    expect(phaseRange('firstAtp')).toEqual({ start: 0, end: 120 });
    expect(phaseRange('secondAtp')).toEqual({ start: 120, end: 240 });
    expect(phaseRange('thirdAtp')).toEqual({ start: 240, end: 360 });
  });

  it('names the ATP being made at a rotor angle', () => {
    expect(phaseAt(0)).toBe('firstAtp');
    expect(phaseAt(119.5)).toBe('firstAtp');
    expect(phaseAt(120)).toBe('secondAtp');
    expect(phaseAt(359)).toBe('thirdAtp');
    expect(phaseAt(360)).toBe('firstAtp');
  });
});
