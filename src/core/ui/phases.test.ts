import { describe, expect, it } from 'vitest';
import type { Timeline } from '../explainer';
import { phaseAt, phaseBands, phaseShortcut, scrubberMax } from './phases';

const phase = (id: string, start: number, end: number) => ({
  id,
  start,
  end,
  labelKey: id,
  jumpLabelKey: id,
  tone: `var(--${id})`,
});

const timeline: Pick<Timeline, 'cycle' | 'phases' | 'step' | 'loop'> = {
  cycle: 400,
  step: 2,
  phases: [phase('a', 0, 100), phase('b', 100, 200), phase('c', 200, 400)],
};

describe('phases', () => {
  it('finds the phase a position falls in', () => {
    expect(phaseAt(timeline, 0).id).toBe('a');
    expect(phaseAt(timeline, 199.5).id).toBe('b');
    expect(phaseAt(timeline, 399).id).toBe('c');
  });

  it('wraps to the first phase at the end of a looping timeline', () => {
    expect(phaseAt(timeline, 400).id).toBe('a');
  });

  it('stays in the last phase at the end of a timeline that stops', () => {
    const oneShot = { ...timeline, loop: false };
    expect(phaseAt(oneShot, 400).id).toBe('c');
    expect(phaseAt(oneShot, 0).id).toBe('a');
  });

  it('lets the scrubber reach the end only when the timeline stops there', () => {
    expect(scrubberMax(timeline)).toBe(398);
    expect(scrubberMax({ ...timeline, loop: false })).toBe(400);
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
