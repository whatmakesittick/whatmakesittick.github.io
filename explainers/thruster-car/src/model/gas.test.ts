import { describe, expect, it } from 'vitest';
import {
  exhaustSpeed,
  fillMinutes,
  isp,
  massFlow,
  nozzleAt,
  pressureAt,
  shareAtPressure,
  storedMass,
  storedWorkMj,
  fillPressureAt,
  tankShellKg,
  thrust,
} from './gas';

describe('gas', () => {
  it('stores 315 kg of air and 51 kg of helium in 600 L at 700 bar', () => {
    expect(storedMass('air', 600)).toBeCloseTo(315.4, 1);
    expect(storedMass('air', 100)).toBeCloseTo(52.6, 1);
    expect(storedMass('helium', 600)).toBeCloseTo(51.4, 1);
  });

  it('holds about 24 MJ of work in 100 L of air and 178 MJ in 600 L of helium', () => {
    expect(storedWorkMj('air', 100)).toBeCloseTo(23.8, 1);
    expect(storedWorkMj('air', 600)).toBeCloseTo(142.6, 0);
    expect(storedWorkMj('helium', 600)).toBeCloseTo(178, 0);
  });

  it('weighs the carbon shell at 0.71 kg a litre', () => {
    expect(tankShellKg(600)).toBeCloseTo(428.9, 0);
  });

  it('turns thrust into mass flow through the exhaust speed and back', () => {
    expect(massFlow(80000, 'air')).toBeCloseTo(114.6, 1);
    expect(thrust(massFlow(2000, 'helium'), 'helium')).toBeCloseTo(2000, 9);
    expect(isp('air')).toBeCloseTo(71, 0);
    expect(exhaustSpeed('helium')).toBeGreaterThan(2.6 * exhaustSpeed('air'));
  });

  it('fills 600 L of air in about 48 minutes at 50 kW and half of it in half the time', () => {
    expect(fillMinutes('air', 600, 1)).toBeCloseTo(47.5, 0);
    expect(fillMinutes('air', 600, 0.5)).toBeCloseTo(fillMinutes('air', 600, 1) / 2, 9);
  });

  it('drops the pressure faster than the mass as the tank empties', () => {
    expect(pressureAt(1)).toBe(700);
    expect(pressureAt(0.67)).toBeCloseTo(210, -1);
    expect(pressureAt(0.5)).toBeCloseTo(87.5, 9);
    expect(shareAtPressure(pressureAt(0.42))).toBeCloseTo(0.42, 9);
  });

  it('fills to 700 bar at 300 K with real-gas pressure rising faster than the mass', () => {
    expect(fillPressureAt(1)).toBeCloseTo(700, 9);
    expect(fillPressureAt(0.5)).toBeCloseTo(257, 0);
    expect(fillPressureAt(0.25)).toBeCloseTo(117, 0);
    expect(fillPressureAt(0)).toBe(0);
  });

  it('scales a choked nozzle with the tank pressure', () => {
    expect(nozzleAt(700, 8000)).toBe(8000);
    expect(nozzleAt(350, 8000)).toBe(4000);
  });
});
