import { describe, expect, it } from 'vitest';
import { rulerLabel, rulerTicks } from './ruler';

describe('depth ruler', () => {
  it('ticks every step and marks every major step', () => {
    const ticks = rulerTicks(25, 4900, 100, 500);
    expect(ticks[0]).toEqual({ depth: 100, major: false });
    const majors = ticks.filter((tick) => tick.major).map((tick) => tick.depth);
    expect(majors).toEqual([500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]);
    expect(ticks[ticks.length - 1].depth).toBe(4900);
  });

  it('writes the depth with digits and metres only', () => {
    expect(rulerLabel(1500)).toBe('1500 m');
    expect(rulerLabel(4500)).toMatch(/^[0-9]+ m$/);
  });
});
