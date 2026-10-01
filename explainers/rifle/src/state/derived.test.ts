import { describe, expect, it } from 'vitest';
import { EXIT_MS, motionAt, shotAt, unitsAt } from '../model';
import { cycleOf } from './derived';

describe('cycle readings', () => {
  it('reads the shot and the parts at the time under the scrubber', () => {
    const phase = unitsAt(30);
    const reading = cycleOf({ phase, gasPort: 'open' });
    expect(reading.ms).toBeCloseTo(30, 9);
    expect(reading.shot).toEqual(shotAt(reading.ms, 'open'));
    expect(reading.motion).toEqual(motionAt(reading.ms, 'open'));
  });

  it('reuses the reading until the time or the gas port changes', () => {
    const first = cycleOf({ phase: 50, gasPort: 'open' });
    expect(cycleOf({ phase: 50, gasPort: 'open' })).toBe(first);
    const blocked = cycleOf({ phase: 50, gasPort: 'blocked' });
    expect(blocked).not.toBe(first);
    expect(blocked.motion.carrier).toBe(0);
    expect(first.motion.carrier).toBeGreaterThan(0);
  });

  it('keeps the gas chamber empty with the port blocked', () => {
    expect(cycleOf({ phase: unitsAt(EXIT_MS), gasPort: 'open' }).shot.gas).toBe(1);
    expect(cycleOf({ phase: unitsAt(EXIT_MS), gasPort: 'blocked' }).shot.gas).toBe(0);
  });
});
