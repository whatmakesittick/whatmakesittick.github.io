import { describe, expect, it } from 'vitest';
import type { GasId, PhaseId } from '../ids';
import { emptyAtSeconds, emptyShare, impulseUsedKns, shortfallMs, tankAt } from './budget';
import { MOMENTS, PHASE_RANGES, RUN_SECONDS, phaseAt } from './run';

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

interface TankOutcome {
  gas: GasId;
  litres: number;
  share: number;
  dryIn: PhaseId | null;
  emptyAt: number;
  shortfall: number;
}

const TANK_OUTCOMES: readonly TankOutcome[] = [
  { gas: 'air', litres: 600, share: 0.207, dryIn: null, emptyAt: 0, shortfall: 0 },
  { gas: 'nitrogen', litres: 600, share: 0.175, dryIn: null, emptyAt: 0, shortfall: 0 },
  { gas: 'helium', litres: 600, share: 0.05, dryIn: 'catch', emptyAt: 12.49, shortfall: 2.94 },
  { gas: 'air', litres: 400, share: 0.05, dryIn: 'twist', emptyAt: 16.23, shortfall: 10.03 },
  { gas: 'nitrogen', litres: 400, share: 0.05, dryIn: 'leap', emptyAt: 15.93, shortfall: 10.03 },
  { gas: 'helium', litres: 400, share: 0.05, dryIn: 'flip', emptyAt: 11.05, shortfall: 11.5 },
];

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

  it('keeps the last 5 percent of the gas unusable', () => {
    expect(emptyShare()).toBe(0.05);
    expect(tankAt(RUN_SECONDS, 'helium', 400).massShare).toBe(emptyShare());
  });

  it('finishes or runs dry where each gas and tank runs out', () => {
    TANK_OUTCOMES.forEach(({ gas, litres, share, dryIn, emptyAt, shortfall }) => {
      const label = `${gas} ${litres} L`;
      const end = tankAt(RUN_SECONDS, gas, litres);
      expect(end.massShare, label).toBeCloseTo(share, 3);
      expect(end.shortfallMs, label).toBeCloseTo(shortfall, 2);
      if (dryIn === null) {
        expect(end.emptyAtSeconds, label).toBeNull();
        return;
      }
      expect(end.emptyAtSeconds, label).toBeCloseTo(emptyAt, 2);
      expect(phaseAt(emptyAt), label).toBe(dryIn);
    });
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
