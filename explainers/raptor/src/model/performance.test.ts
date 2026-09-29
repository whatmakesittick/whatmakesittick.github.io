import { describe, expect, it } from 'vitest';
import { SEA_LEVEL_PRESSURE_PA } from './atmosphere';
import { MAX_Q_TIME, engineState, phaseAt } from './flight';
import {
  BOOSTER_ENGINES,
  EXIT_AREA_M2,
  VACUUM_THRUST_TF,
  boosterThrustTf,
  chamberPressureBar,
  exhaustSpeedKmS,
  massFlow,
  methaneFlow,
  oxygenFlow,
  specificImpulse,
  thrustTf,
  thrustToWeight,
} from './performance';

describe('engine performance', () => {
  it('has a 1.3 m nozzle exit of about 1.33 square metres', () => {
    expect(EXIT_AREA_M2).toBeCloseTo(1.327, 3);
  });

  it('gives 250 t at sea level and about 264 t in vacuum at full throttle', () => {
    expect(thrustTf(1, SEA_LEVEL_PRESSURE_PA)).toBeCloseTo(250, 6);
    expect(thrustTf(1, 0)).toBeCloseTo(263.7, 1);
    expect(VACUUM_THRUST_TF).toBeCloseTo(263.7, 1);
  });

  it('never pushes backwards when the engine is off', () => {
    expect(thrustTf(0, SEA_LEVEL_PRESSURE_PA)).toBe(0);
    expect(specificImpulse(0, SEA_LEVEL_PRESSURE_PA)).toBe(0);
    expect(exhaustSpeedKmS(0, 0)).toBe(0);
  });

  it('burns 758 kg a second, 593 of oxygen and 165 of methane', () => {
    expect(massFlow(1)).toBe(758);
    expect(oxygenFlow(1)).toBeCloseTo(593, 0);
    expect(methaneFlow(1)).toBeCloseTo(165, 0);
    expect(oxygenFlow(0.5) + methaneFlow(0.5)).toBeCloseTo(massFlow(0.5));
  });

  it('gets about 330 s at sea level and about 348 s in vacuum', () => {
    expect(specificImpulse(1, SEA_LEVEL_PRESSURE_PA)).toBeCloseTo(330, 0);
    expect(specificImpulse(1, 0)).toBeCloseTo(348, 0);
    expect(exhaustSpeedKmS(1, SEA_LEVEL_PRESSURE_PA)).toBeCloseTo(3.2, 1);
  });

  it('scales the chamber pressure with the throttle', () => {
    expect(chamberPressureBar(1)).toBe(330);
    expect(chamberPressureBar(0.8)).toBeCloseTo(264);
  });

  it('pushes about 164 times its own weight and 8,250 t with all 33 engines', () => {
    expect(thrustToWeight(250)).toBeCloseTo(164, 0);
    expect(BOOSTER_ENGINES).toBe(33);
    expect(boosterThrustTf(250)).toBe(8250);
  });

  it('dips to about 205 t around max-Q', () => {
    const engine = engineState(phaseAt(MAX_Q_TIME));
    const thrust = thrustTf(engine.throttle, engine.airPressurePa);
    expect(thrust).toBeGreaterThan(200);
    expect(thrust).toBeLessThan(210);
  });
});
