import { describe, expect, it } from 'vitest';
import { MAX_Q_TIME, phaseAt } from '../model';
import { engineOf, performanceOf } from './derived';

describe('derived engine values', () => {
  it('reads the engine off the flight at the phase', () => {
    expect(engineOf({ phase: 0 })).toMatchObject({ time: -3, throttle: 0, running: false });
    expect(engineOf({ phase: 3 })).toMatchObject({ time: 0, throttle: 1, running: true });
  });

  it('gives 250 t, about 330 s and a squeezed plume at liftoff', () => {
    const liftoff = performanceOf({ phase: 3 });
    expect(liftoff.firing).toBe(true);
    expect(liftoff.thrustTf).toBeCloseTo(250, 0);
    expect(liftoff.specificImpulse).toBeCloseTo(330, 0);
    expect(liftoff.oxygenFlow).toBeCloseTo(593, 0);
    expect(liftoff.methaneFlow).toBeCloseTo(165, 0);
    expect(liftoff.chamberPressureBar).toBe(330);
    expect(liftoff.exitPressureBar).toBeCloseTo(0.9);
    expect(liftoff.airShare).toBeCloseTo(1);
    expect(liftoff.plume).toBe('squeezed');
  });

  it('throttles down around max-Q and spreads the plume high up', () => {
    expect(performanceOf({ phase: phaseAt(MAX_Q_TIME) }).chamberPressureBar).toBeCloseTo(264);
    const high = performanceOf({ phase: phaseAt(120) });
    expect(high.plume).toBe('spreading');
    expect(high.thrustTf).toBeGreaterThan(260);
    expect(high.specificImpulse).toBeGreaterThan(345);
  });

  it('calls the plume off while the engine is not firing', () => {
    const before = performanceOf({ phase: 0 });
    expect(before).toMatchObject({ firing: false, thrustTf: 0, specificImpulse: 0, plume: 'off' });
    expect(performanceOf({ phase: 145 }).plume).toBe('off');
  });

  it('works the values out once for each phase', () => {
    const first = performanceOf({ phase: 40 });
    expect(performanceOf({ phase: 40 })).toBe(first);
    expect(performanceOf({ phase: 41 })).not.toBe(first);
  });
});
