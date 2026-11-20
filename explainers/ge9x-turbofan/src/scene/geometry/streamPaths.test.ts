import { describe, expect, it } from 'vitest';
import {
  COLD_CONTROLS,
  HOT_CONTROLS,
  REVERSED_CONTROLS,
  TABLE_SAMPLES,
  radiusAtX,
  streamTable,
} from './streamPaths';

describe('stream paths', () => {
  it('run from in front of the intake to behind the nozzles', () => {
    const cold = streamTable(COLD_CONTROLS, 'cold');
    const hot = streamTable(HOT_CONTROLS, 'core');
    expect(cold.x[0]).toBeLessThan(-2.8);
    expect(cold.x[TABLE_SAMPLES - 1]).toBeGreaterThan(2.8);
    expect(hot.x[TABLE_SAMPLES - 1]).toBeGreaterThan(2.8);
    expect(cold.length).toBeGreaterThan(7);
  });

  it('keeps the cold stream around the hot one inside the engine', () => {
    const cold = streamTable(COLD_CONTROLS, 'cold');
    const hot = streamTable(HOT_CONTROLS, 'core');
    [-1.5, 0, 1.5].forEach((x) =>
      expect(radiusAtX(cold, x)).toBeGreaterThan(radiusAtX(hot, x) + 0.3),
    );
  });

  it('turns the reversed cold stream forward outside the nacelle', () => {
    const reversed = streamTable(REVERSED_CONTROLS, 'cold');
    const last = TABLE_SAMPLES - 1;
    expect(reversed.x[last]).toBeLessThan(0);
    expect(reversed.r[last]).toBeGreaterThan(2.35);
  });

  it('swirls the hot stream through the turbines', () => {
    const hot = streamTable(HOT_CONTROLS, 'core');
    expect(hot.swirl[TABLE_SAMPLES - 1]).toBeGreaterThan(hot.swirl[0] + 1);
  });
});
