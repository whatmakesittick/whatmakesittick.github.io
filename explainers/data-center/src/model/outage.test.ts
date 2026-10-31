import { describe, expect, it } from 'vitest';
import type { OutageReading } from '../ids';
import { GEN_START_S } from './constants';
import { GRID_RETURN_S, OUTAGE_DRILL_SECONDS, outageAt } from './outage';

const ON_GRID: OutageReading = {
  source: 'grid',
  gridOn: true,
  generatorShare: 0,
  batteryShare: 0,
};

const DRILL: readonly (readonly [number, OutageReading])[] = [
  [0, { source: 'battery', gridOn: false, generatorShare: 0, batteryShare: 1 }],
  [5, { source: 'battery', gridOn: false, generatorShare: 0.5, batteryShare: 1 }],
  [10, { source: 'generator', gridOn: false, generatorShare: 1, batteryShare: 0 }],
  [15, { source: 'generator', gridOn: false, generatorShare: 1, batteryShare: 0 }],
  [20, { source: 'grid', gridOn: true, generatorShare: 1, batteryShare: 0 }],
  [22, { source: 'grid', gridOn: true, generatorShare: 0.5, batteryShare: 0 }],
  [24, ON_GRID],
];

describe('outageAt', () => {
  it('lasts 24 seconds, with the generators up at 10 s and the grid back at 20 s', () => {
    expect(OUTAGE_DRILL_SECONDS).toBe(24);
    expect(GEN_START_S).toBe(10);
    expect(GRID_RETURN_S).toBe(20);
  });

  it.each(DRILL)('reads the drill %s s after the cut', (seconds, expected) => {
    const reading = outageAt(seconds);
    expect(reading).toMatchObject({ source: expected.source, gridOn: expected.gridOn });
    expect(reading.generatorShare).toBeCloseTo(expected.generatorShare, 9);
    expect(reading.batteryShare).toBeCloseTo(expected.batteryShare, 9);
  });

  it('runs on the grid outside the drill', () => {
    [-1, OUTAGE_DRILL_SECONDS, 60, Number.POSITIVE_INFINITY, Number.NaN].forEach((seconds) =>
      expect(outageAt(seconds), String(seconds)).toEqual(ON_GRID),
    );
  });
});
