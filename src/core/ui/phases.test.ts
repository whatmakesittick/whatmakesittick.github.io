import { describe, expect, it } from 'vitest';
import type { Timeline } from '../explainer';
import { phaseAt, phaseBands, phaseShortcut } from './phases';

const phase = (id: string, start: number, end: number) => ({
  id,
  start,
  end,
  labelKey: id,
  jumpLabelKey: id,
  tone: `var(--${id})`,
});

const timeline: Pick<Timeline, 'cycle' | 'phases'> = {
  cycle: 400,
  phases: [phase('a', 0, 100), phase('b', 100, 200), phase('c', 200, 400)],
};

describe('phases', () => {
  it('finds the phase a position falls in', () => {
    expect(phaseAt(timeline, 0).id).toBe('a');
    expect(phaseAt(timeline, 199.5).id).toBe('b');
    expect(phaseAt(timeline, 399).id).toBe('c');
  });

  it('paints one coloured band per phase with a gap at each boundary', () => {
    expect(phaseBands(timeline)).toBe(
      'linear-gradient(90deg, ' +
        'var(--a) 0 calc(25% - var(--track-gap)), transparent 0 calc(25% + var(--track-gap)), ' +
        'var(--b) 0 calc(50% - var(--track-gap)), transparent 0 calc(50% + var(--track-gap)), ' +
        'var(--c) 0)',
    );
  });

  it('offers digit shortcuts for the first nine phases only', () => {
    expect(phaseShortcut(0)).toBe('1');
    expect(phaseShortcut(8)).toBe('9');
    expect(phaseShortcut(9)).toBeUndefined();
  });
});
