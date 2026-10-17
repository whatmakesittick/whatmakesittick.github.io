import { describe, expect, it } from 'vitest';
import { smoothCurve, softRamp, solveIncreasing } from './curve';
import type { Knot } from './curve';

const KNOTS: readonly Knot[] = [
  [0, 0],
  [1, 2],
  [2, 2.2],
  [3, 0.5],
];
const SAMPLES = 120;
const KNEE = 0.1;
const STEP = 1e-6;

describe('smoothCurve', () => {
  const curve = smoothCurve(KNOTS);

  it('passes through every knot and holds the ends', () => {
    KNOTS.forEach(([at, value]) => expect(curve(at)).toBeCloseTo(value, 9));
    expect(curve(-1)).toBe(0);
    expect(curve(4)).toBe(0.5);
  });

  it('never overshoots the knots it runs between', () => {
    for (let step = 0; step <= SAMPLES; step += 1) {
      const at = (3 * step) / SAMPLES;
      const index = Math.min(KNOTS.length - 2, Math.floor(at));
      const [low, high] = [KNOTS[index][1], KNOTS[index + 1][1]].sort((a, b) => a - b);
      expect(curve(at)).toBeGreaterThanOrEqual(low - STEP);
      expect(curve(at)).toBeLessThanOrEqual(high + STEP);
    }
  });
});

describe('softRamp', () => {
  it('stays at zero below the knee and joins the shifted line above it', () => {
    expect(softRamp(-1, KNEE)).toBe(0);
    expect(softRamp(2 * KNEE, KNEE)).toBeCloseTo(KNEE, 9);
    expect(softRamp(1, KNEE)).toBeCloseTo(1 - KNEE, 9);
    const slope = (softRamp(2 * KNEE + STEP, KNEE) - softRamp(2 * KNEE - STEP, KNEE)) / (2 * STEP);
    expect(slope).toBeCloseTo(1, 4);
  });
});

describe('solveIncreasing', () => {
  it('finds where a rising curve meets a target', () => {
    expect(solveIncreasing((at) => at * at, 0.25)).toBeCloseTo(0.5, 9);
  });
});
