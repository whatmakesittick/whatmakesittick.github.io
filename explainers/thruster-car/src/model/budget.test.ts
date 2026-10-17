import { describe, expect, it } from 'vitest';
import { GAS_IDS } from '../ids';
import { TANK_LITRES } from './constants';
import { emptyAtSeconds, impulseUsedKns, shortfallMs, tankAt } from './budget';
import { MOMENTS, PHASE_RANGES, RUN_SECONDS } from './run';

describe('budget', () => {
  it('spends 27.2 kN s on the boost, 5.8 on the flip and 23.9 on the catch', () => {
    const { boost, flip, catch: cushion } = PHASE_RANGES;
    expect(impulseUsedKns(boost.end)).toBeCloseTo(27.2, 1);
    expect(impulseUsedKns(flip.end) - impulseUsedKns(flip.start)).toBeCloseTo(5.8, 1);
    expect(impulseUsedKns(cushion.end) - impulseUsedKns(cushion.start)).toBeCloseTo(23.9, 1);
    expect(impulseUsedKns(RUN_SECONDS)).toBeCloseTo(impulseUsedKns(cushion.end), 9);
  });

  it('starts every tank full at 700 bar', () => {
    const start = tankAt(0, 'air', 600);
    expect(start.massShare).toBe(1);
    expect(start.pressureBar).toBe(700);
    expect(start.massKg).toBeCloseTo(315.4, 1);
    expect(start.empty).toBe(false);
  });

  it('ends the air run with about 74 percent left at about 285 bar', () => {
    const end = tankAt(RUN_SECONDS, 'air', 600);
    expect(end.massShare).toBeCloseTo(0.74, 2);
    expect(end.pressureBar).toBeCloseTo(285, -1);
    expect(end.empty).toBe(false);
    expect(end.emptyAtSeconds).toBeNull();
    expect(end.shortfallMs).toBe(0);
  });

  it('runs the small helium tank dry about 0.6 s into the catch and lands harder', () => {
    const emptyAt = emptyAtSeconds('helium', 400);
    expect(emptyAt).not.toBeNull();
    expect(emptyAt! - PHASE_RANGES.catch.start).toBeCloseTo(0.6, 1);
    expect(emptyAt!).toBeLessThan(MOMENTS.touchdown);
    expect(shortfallMs('helium', 400)).toBeGreaterThan(0);
    expect(tankAt(emptyAt! - 0.01, 'helium', 400).empty).toBe(false);
    expect(tankAt(emptyAt!, 'helium', 400).empty).toBe(true);
  });

  it('lands every other gas and tank with gas to spare', () => {
    GAS_IDS.forEach((gas) =>
      Object.values(TANK_LITRES)
        .filter((litres) => gas !== 'helium' || litres !== TANK_LITRES['400'])
        .forEach((litres) => expect(tankAt(RUN_SECONDS, gas, litres).empty).toBe(false)),
    );
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
