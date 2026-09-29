import { describe, expect, it } from 'vitest';
import { CONDUCTION_TIMING } from '../../model';
import { pulseLevel, strongest } from './glowPulse';

const SHAPE = { riseMs: 5, fadeMs: 40, rest: 0.1 };

describe('conduction glow', () => {
  it('rests before the signal arrives and lights up while it passes', () => {
    const { start, end } = CONDUCTION_TIMING.avNode;
    expect(pulseLevel('avNode', start - 20, SHAPE)).toBe(0.1);
    expect(pulseLevel('avNode', (start + end) / 2, SHAPE)).toBe(1);
  });

  it('fades after the signal has passed', () => {
    const { end } = CONDUCTION_TIMING.bundle;
    const soon = pulseLevel('bundle', end + 10, SHAPE);
    const later = pulseLevel('bundle', end + 100, SHAPE);
    expect(soon).toBeLessThan(1);
    expect(later).toBeLessThan(soon);
    expect(later).toBeGreaterThanOrEqual(0.1);
  });

  it('takes the brightest of several parts', () => {
    const { start } = CONDUCTION_TIMING.branches;
    expect(strongest(['bundle', 'branches'], start + 1, SHAPE)).toBe(1);
  });
});
