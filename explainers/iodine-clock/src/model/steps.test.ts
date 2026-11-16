import { describe, expect, it } from 'vitest';
import { PHASE_IDS, STEP_IDS } from '../ids';
import type { PhaseId, StepId, StepStateId } from '../ids';
import { stepStateAt } from './steps';

function row(step: StepId): StepStateId[] {
  return PHASE_IDS.map((phase: PhaseId) => stepStateAt(step, phase));
}

describe('reaction steps', () => {
  it('runs the slow step until the bisulfite is gone', () => {
    expect(row('landolt')).toEqual([
      'running',
      'running',
      'running',
      'finished',
      'finished',
      'finished',
    ]);
  });

  it('starts the Dushman step and the iodine eating once the liquids are mixed', () => {
    expect(row('dushman')).toEqual(['waiting', ...Array<StepStateId>(5).fill('running')]);
    expect(row('eaten')).toEqual([
      'waiting',
      'running',
      'running',
      'finished',
      'finished',
      'finished',
    ]);
  });

  it('builds triiodide from the switch and fills the helix after it', () => {
    expect(row('triiodide').indexOf('running')).toBe(PHASE_IDS.indexOf('iodine'));
    expect(row('helix').indexOf('running')).toBe(PHASE_IDS.indexOf('complex'));
  });

  it('never goes back to waiting once a step has started', () => {
    STEP_IDS.forEach((step) => {
      const states = row(step);
      const started = states.findIndex((state) => state !== 'waiting');
      expect(states.slice(started)).not.toContain('waiting');
    });
  });
});
