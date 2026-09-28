import { describe, expect, it } from 'vitest';
import { depthOfField, fieldOfView } from './field';

describe('field of view', () => {
  it('divides the field number 20 by the objective', () => {
    expect(fieldOfView('x4')).toBeCloseTo(5, 9);
    expect(fieldOfView('x10')).toBeCloseTo(2, 9);
    expect(fieldOfView('x40')).toBeCloseTo(0.5, 9);
    expect(fieldOfView('x100')).toBeCloseTo(0.2, 9);
  });
});

describe('depth of field', () => {
  it('matches the facts sheet at 10x/0.25 and 100x/1.25 oil', () => {
    expect(depthOfField('x10')).toBeCloseTo(8.5, 6);
    expect(depthOfField('x100')).toBeCloseTo(0.7, 6);
  });

  it('lands the 40x/0.65 inside the published 1.0 to 3.04 µm', () => {
    expect(depthOfField('x40')).toBeGreaterThan(1);
    expect(depthOfField('x40')).toBeLessThan(3.04);
  });

  it('shrinks as the aperture opens', () => {
    const depths = (['x4', 'x10', 'x40', 'x100'] as const).map(depthOfField);
    expect(depths[0]).toBeGreaterThan(40);
    depths.slice(1).forEach((depth, index) => expect(depth).toBeLessThan(depths[index]));
  });
});
