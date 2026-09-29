import { describe, expect, it } from 'vitest';
import { airPressure } from './atmosphere';
import { exitPressureBar, plumeShape, plumeState, pressureRatio } from './plume';

describe('pressure ratio', () => {
  it('leaves the exhaust a little below sea-level air at full throttle', () => {
    expect(exitPressureBar(1)).toBe(0.9);
    const ratio = pressureRatio(1, airPressure(0));
    expect(ratio).toBeCloseTo(0.888, 2);
    expect(plumeState(ratio)).toBe('squeezed');
  });

  it('spreads the plume once the air thins', () => {
    expect(plumeState(pressureRatio(1, airPressure(5)))).toBe('spreading');
    expect(plumeState(1)).toBe('matched');
  });
});

describe('plumeShape', () => {
  it('pinches the plume and shows bright diamonds at sea level', () => {
    const shape = plumeShape(1, airPressure(0));
    expect(shape.spreadDeg).toBe(0);
    expect(shape.waist).toBeLessThan(1);
    expect(shape.diamondStrength).toBe(1);
    expect(shape.diamondSpacing).toBeGreaterThan(170);
    expect(shape.diamondSpacing).toBeLessThan(200);
    expect(shape.diamondCount).toBeGreaterThan(3);
  });

  it('loses the diamonds and opens wide high up', () => {
    const shape = plumeShape(1, airPressure(20));
    expect(shape.diamondStrength).toBe(0);
    expect(shape.spreadDeg).toBeGreaterThan(20);
    expect(shape.waist).toBe(1);
    expect(shape.length).toBeGreaterThan(plumeShape(1, airPressure(0)).length);
  });

  it('vanishes with the engine off', () => {
    const shape = plumeShape(0, airPressure(0));
    expect(shape.length).toBe(0);
    expect(shape.brightness).toBe(0);
    expect(shape.diamondStrength).toBe(0);
    expect(shape.diamondCount).toBe(0);
  });
});
