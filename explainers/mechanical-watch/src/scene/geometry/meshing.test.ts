import { describe, expect, it } from 'vitest';
import { drivenAngle, meshPhase, wrapPhase } from './meshing';

describe('meshing phase', () => {
  const driverTeeth = 80;
  const drivenTeeth = 10;
  const direction = 1.1;
  const phase = meshPhase(drivenTeeth, direction);

  it('centres a driver tooth and a driven gap on the line of centres', () => {
    expect(phase.driver).toBeCloseTo(direction);
    const gap = phase.driven + Math.PI / drivenTeeth;
    expect(Math.cos(gap - (direction + Math.PI))).toBeCloseTo(1);
  });

  it('turns the driven gear one leaf for every driver tooth', () => {
    const driverPitch = (Math.PI * 2) / driverTeeth;
    const drivenPitch = (Math.PI * 2) / drivenTeeth;
    expect(Math.abs(drivenAngle(driverPitch, driverTeeth, drivenTeeth))).toBeCloseTo(drivenPitch);
    expect(wrapPhase(drivenPitch * 3 + 0.01, drivenTeeth)).toBeCloseTo(0.01);
  });
});
