import { describe, expect, it } from 'vitest';
import type { PhaseId } from '../ids';
import { emptyAtSeconds, impulseUsedKns, shortfallMs, tankAt } from './budget';
import { MOMENTS, PHASE_RANGES, RUN_SECONDS } from './run';

const PHASE_IMPULSE_KNS: Readonly<Partial<Record<PhaseId, number>>> = {
  sprint: 45.6,
  deck: 11.9,
  flip: 10.0,
  catch: 27.7,
  runUp: 13.6,
  leap: 27.9,
  twist: 14.2,
  landing: 23.8,
};

function phaseImpulse(id: PhaseId): number {
  const { start, end } = PHASE_RANGES[id];
  return impulseUsedKns(end) - impulseUsedKns(start);
}

describe('budget', () => {
  it('spends the impulse of each burn in its own phase', () => {
    Object.entries(PHASE_IMPULSE_KNS).forEach(([id, kns]) =>
      expect(phaseImpulse(id as PhaseId), id).toBeCloseTo(kns, 1),
    );
    expect(impulseUsedKns(RUN_SECONDS)).toBeCloseTo(174.7, 1);
    expect(impulseUsedKns(RUN_SECONDS)).toBeCloseTo(impulseUsedKns(PHASE_RANGES.landing.end), 9);
  });

  it('starts every tank full at 700 bar', () => {
    const start = tankAt(0, 'air', 600);
    expect(start.massShare).toBe(1);
    expect(start.pressureBar).toBe(700);
    expect(start.massKg).toBeCloseTo(315.4, 1);
    expect(start.empty).toBe(false);
  });

  it('ends the air run with about 21 percent left at about 6 bar', () => {
    const end = tankAt(RUN_SECONDS, 'air', 600);
    expect(end.massShare).toBeCloseTo(0.207, 3);
    expect(end.pressureBar).toBeCloseTo(6.2, 1);
    expect(end.empty).toBe(false);
    expect(end.emptyAtSeconds).toBeNull();
    expect(end.shortfallMs).toBe(0);
  });

  it('runs the small air tank dry over the jump, so the last landing loses its cushion', () => {
    const emptyAt = emptyAtSeconds('air', 400) ?? Number.NaN;
    expect(emptyAt).toBeGreaterThan(MOMENTS.liftOff);
    expect(emptyAt).toBeLessThan(MOMENTS.landed);
    expect(shortfallMs('air', 400)).toBeCloseTo(10, 0);
  });

  it('runs a 600 L nitrogen tank to the cut-off in the jump landing', () => {
    const emptyAt = emptyAtSeconds('nitrogen', 600) ?? Number.NaN;
    expect(emptyAt).toBeGreaterThan(PHASE_RANGES.landing.start);
    expect(emptyAt).toBeLessThan(MOMENTS.landed);
    expect(shortfallMs('nitrogen', 600)).toBeGreaterThan(0);
  });

  it('runs helium dry before the hook touchdown in either tank', () => {
    const small = emptyAtSeconds('helium', 400) ?? Number.NaN;
    const large = emptyAtSeconds('helium', 600) ?? Number.NaN;
    expect(small).toBeLessThan(PHASE_RANGES.catch.start);
    expect(large).toBeGreaterThan(PHASE_RANGES.catch.start);
    expect(large).toBeLessThan(MOMENTS.touchdown);
    expect(shortfallMs('helium', 600)).toBeGreaterThan(0);
    expect(shortfallMs('helium', 400)).toBeGreaterThan(shortfallMs('helium', 600));
    expect(tankAt(large - 0.01, 'helium', 600).empty).toBe(false);
    expect(tankAt(large, 'helium', 600).empty).toBe(true);
  });

  it('never refills the tank as the run goes on', () => {
    let previous = 1;
    for (let seconds = 0; seconds <= RUN_SECONDS; seconds += 0.05) {
      const share = tankAt(seconds, 'helium', 400).massShare;
      expect(share).toBeLessThanOrEqual(previous);
      previous = share;
    }
  });
});
