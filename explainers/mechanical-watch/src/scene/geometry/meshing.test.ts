import { describe, expect, it } from 'vitest';
import { meshPhase } from './meshing';

describe('meshing phase', () => {
  const drivenTeeth = 10;
  const direction = 1.1;
  const phase = meshPhase(drivenTeeth, direction);

  it('centres a driver tooth and a driven gap on the line of centres', () => {
    expect(phase.driver).toBeCloseTo(direction);
    const gap = phase.driven + Math.PI / drivenTeeth;
    expect(Math.cos(gap - (direction + Math.PI))).toBeCloseTo(1);
  });
});
