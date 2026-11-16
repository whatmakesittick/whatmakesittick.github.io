import { describe, expect, it } from 'vitest';
import {
  I2_FINAL_M,
  VISIBLE_IODINE_M,
  acidAt,
  bisulfiteAt,
  colourDepth,
  iodateAt,
  iodideAt,
  iodineAt,
  iodineLifetime,
  sulfateAt,
} from './kinetics';
import { BISULFITE_START_M, IODATE_RANGE_MM, toMolar } from './recipe';

const SWITCH_S = 10;
const START_IODATE_M = toMolar(IODATE_RANGE_MM.default);
const SAMPLES = Array.from({ length: 151 }, (_, index) => index * 0.1);

describe('kinetics', () => {
  it('starts with all the bisulfite and runs out exactly at the switch', () => {
    expect(bisulfiteAt(0, SWITCH_S)).toBeCloseTo(BISULFITE_START_M, 12);
    expect(bisulfiteAt(SWITCH_S - 1e-9, SWITCH_S)).toBeCloseTo(0, 9);
    expect(bisulfiteAt(SWITCH_S, SWITCH_S)).toBe(0);
    expect(bisulfiteAt(SWITCH_S + 1, SWITCH_S)).toBe(0);
  });

  it('uses bisulfite slowly at first, then faster', () => {
    const early = BISULFITE_START_M - bisulfiteAt(SWITCH_S / 2, SWITCH_S);
    expect(early).toBeLessThan(BISULFITE_START_M / 4);
  });

  it('keeps every iodine atom: iodate, iodide and twice the iodine add up', () => {
    SAMPLES.forEach((seconds) => {
      const total =
        iodateAt(seconds, SWITCH_S, START_IODATE_M) +
        iodideAt(seconds, SWITCH_S) +
        2 * iodineAt(seconds, SWITCH_S);
      expect(total).toBeCloseTo(START_IODATE_M, 12);
    });
  });

  it('turns each used bisulfite into a sulfate', () => {
    SAMPLES.forEach((seconds) =>
      expect(sulfateAt(seconds, SWITCH_S) + bisulfiteAt(seconds, SWITCH_S)).toBeCloseTo(
        BISULFITE_START_M,
        12,
      ),
    );
  });

  it('has 4.17 mM iodide at the switch and 7.5 mM acid at the end', () => {
    expect(iodideAt(SWITCH_S, SWITCH_S)).toBeCloseTo(BISULFITE_START_M / 3, 9);
    expect(acidAt(SWITCH_S + 5, SWITCH_S)).toBeCloseTo(0.0075, 6);
  });

  it('holds iodine at zero until the switch, then rises to 2.5 mM', () => {
    expect(iodineAt(SWITCH_S - 0.001, SWITCH_S)).toBe(0);
    expect(iodineAt(SWITCH_S + 5, SWITCH_S)).toBeCloseTo(I2_FINAL_M, 9);
    expect(I2_FINAL_M).toBeCloseTo(0.0025, 12);
  });

  it('lets iodine live about 44 ns at the start, and forever with no bisulfite', () => {
    expect(iodineLifetime(BISULFITE_START_M) * 1e9).toBeCloseTo(44.4, 1);
    expect(iodineLifetime(0)).toBe(Infinity);
  });

  it('shows no colour below 20 µM and full colour at the final iodine', () => {
    expect(colourDepth(0)).toBe(0);
    expect(colourDepth(VISIBLE_IODINE_M * 0.99)).toBe(0);
    expect(colourDepth(VISIBLE_IODINE_M)).toBeGreaterThan(0);
    expect(colourDepth(I2_FINAL_M)).toBe(1);
  });
});
