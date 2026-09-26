import { describe, expect, it } from 'vitest';
import { PETROL } from './spec';
import {
  clearanceHeight,
  crankGeometry,
  cylinderVolume,
  pistonDisplacement,
  pistonPinHeight,
  pistonVelocityPerRadian,
  rodTilt,
  sweptVolume,
  topDeadCentreHeight,
} from './kinematics';

const geometry = crankGeometry(PETROL);

describe('kinematics', () => {
  it('places the piston at top dead centre at 0 degrees', () => {
    expect(pistonPinHeight(0, geometry)).toBeCloseTo(topDeadCentreHeight(geometry));
    expect(pistonDisplacement(0, geometry)).toBeCloseTo(0);
  });

  it('travels exactly one stroke to bottom dead centre', () => {
    expect(pistonDisplacement(180, geometry)).toBeCloseTo(PETROL.strokeLength);
  });

  it('returns to top dead centre every revolution', () => {
    expect(pistonDisplacement(360, geometry)).toBeCloseTo(0);
    expect(pistonDisplacement(720, geometry)).toBeCloseTo(0);
  });

  it('has zero velocity at both dead centres', () => {
    expect(pistonVelocityPerRadian(0, geometry)).toBeCloseTo(0);
    expect(pistonVelocityPerRadian(180, geometry)).toBeCloseTo(0);
  });

  it('moves faster near top dead centre than near bottom dead centre', () => {
    const nearTop = Math.abs(pistonVelocityPerRadian(45, geometry));
    const nearBottom = Math.abs(pistonVelocityPerRadian(135, geometry));
    expect(nearTop).toBeGreaterThan(nearBottom);
  });

  it('tilts the rod the most at quarter turns', () => {
    expect(rodTilt(0, geometry)).toBeCloseTo(0);
    expect(rodTilt(90, geometry)).toBeCloseTo(Math.asin(geometry.crankRadius / geometry.rodLength));
    expect(rodTilt(270, geometry)).toBeCloseTo(-rodTilt(90, geometry));
  });

  it('derives the clearance volume from the compression ratio', () => {
    const top = cylinderVolume(0, PETROL);
    const bottom = cylinderVolume(180, PETROL);
    expect(bottom / top).toBeCloseTo(PETROL.compressionRatio);
    expect(bottom - top).toBeCloseTo(sweptVolume(PETROL));
    expect(clearanceHeight(PETROL)).toBeCloseTo(
      PETROL.strokeLength / (PETROL.compressionRatio - 1),
    );
  });
});
