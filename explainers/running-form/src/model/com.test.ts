import { describe, expect, it } from 'vitest';
import { comAt } from './com';
import { CYCLE_UNITS } from './playback';

const SAMPLES = 200;

describe('centre of mass', () => {
  it('reports the same swings at every point of the cycle and on repeated asks', () => {
    const first = comAt(0, 'steady', 0);
    const later = comAt(CYCLE_UNITS / 3, 'steady', 0);
    expect(first.risePeakToPeakM).toBeGreaterThan(0);
    expect(later.risePeakToPeakM).toBe(first.risePeakToPeakM);
    expect(later.surgePeakToPeakM).toBe(first.surgePeakToPeakM);
    expect(later.speedSwingMs).toBe(first.speedSwingMs);
    expect(comAt(0, 'fast', 0).risePeakToPeakM).not.toBe(first.risePeakToPeakM);
  });

  it('keeps the sampled height inside its reported swing', () => {
    const { risePeakToPeakM } = comAt(0, 'steady', 0);
    const heights = Array.from(
      { length: SAMPLES },
      (_, at) => comAt((at * CYCLE_UNITS) / SAMPLES, 'steady', 0).heightM,
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(risePeakToPeakM * 1.05);
  });
});
