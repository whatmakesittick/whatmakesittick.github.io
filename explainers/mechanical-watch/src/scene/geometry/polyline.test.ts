import { describe, expect, it } from 'vitest';
import { Polyline } from './polyline';

describe('polyline', () => {
  const line = new Polyline([
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 4 },
  ]);

  it('measures its length', () => {
    expect(line.length).toBeCloseTo(7);
  });

  it('walks along its segments and wraps around', () => {
    expect(line.at(1.5)).toEqual({ x: 1.5, y: 0 });
    expect(line.at(5).y).toBeCloseTo(2);
    expect(line.at(8.5).x).toBeCloseTo(1.5);
  });
});
