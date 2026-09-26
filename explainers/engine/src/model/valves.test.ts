import { describe, expect, it } from 'vitest';
import { PETROL } from './spec';
import { camAngle, exhaustLift, intakeLift, valveLift, valveOverlap } from './valves';

describe('valves', () => {
  it('is closed outside the open window', () => {
    expect(valveLift(300, 705, 225, 9)).toBe(0);
    expect(valveLift(705, 705, 225, 9)).toBe(0);
    expect(valveLift(225, 705, 225, 9)).toBe(0);
  });

  it('reaches maximum lift midway through the window', () => {
    const midpoint = (705 + (225 + 720)) / 2;
    expect(valveLift(midpoint, 705, 225, 9)).toBeCloseTo(9);
  });

  it('opens the intake valve during intake and the exhaust valve during exhaust', () => {
    expect(intakeLift(90, PETROL)).toBeGreaterThan(0);
    expect(exhaustLift(90, PETROL)).toBe(0);
    expect(exhaustLift(630, PETROL)).toBeGreaterThan(0);
    expect(intakeLift(630, PETROL)).toBe(0);
  });

  it('keeps both valves shut through compression and power', () => {
    for (const angle of [240, 300, 360, 420, 480]) {
      expect(intakeLift(angle, PETROL)).toBe(0);
      expect(exhaustLift(angle, PETROL)).toBe(0);
    }
  });

  it('turns the cam at half crank speed', () => {
    expect(camAngle(0)).toBe(0);
    expect(camAngle(360)).toBe(180);
    expect(camAngle(720)).toBe(0);
  });

  it('reports the overlap around top dead centre', () => {
    expect(valveOverlap(PETROL)).toBe(30);
  });
});
