import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PHASE_RANGES } from '../model';
import { createClockStore } from '../state';
import type { ClockStore } from '../state';
import { mountStepList } from './stepList';
import { TEST_LOCALE, initTestLocale, steps } from './testing';

const { state: stepStates } = TEST_LOCALE.steps;

function item(step: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-step="${step}"]`);
  if (!found) throw new Error(`No ${step} step`);
  return found;
}

function stateText(step: string): string | null | undefined {
  return item(step).querySelector('[data-step-state]')?.textContent;
}

describe('step list', () => {
  let store: ClockStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = steps(['landolt', 'dushman', 'eaten', 'triiodide', 'helix']);
    store = createClockStore({ phase: 0, playing: false });
    dispose = mountStepList(document, store);
  });

  afterEach(() => dispose());

  it('marks only the slow step as running during the pour', () => {
    expect(item('landolt').dataset.state).toBe('running');
    expect(stateText('landolt')).toBe(stepStates.running);
    expect(item('dushman').dataset.state).toBe('waiting');
    expect(stateText('helix')).toBe(stepStates.waiting);
  });

  it('finishes the slow step and starts the starch at the switch', () => {
    store.getState().setPhase(PHASE_RANGES.complex.start);
    expect(item('landolt').dataset.state).toBe('finished');
    expect(stateText('eaten')).toBe(stepStates.finished);
    expect(item('triiodide').dataset.state).toBe('running');
    expect(item('helix').dataset.state).toBe('running');
  });

  it('fails loudly on an unknown step', () => {
    document.body.innerHTML = steps(['boiling']);
    expect(() => mountStepList(document, store)).toThrow();
  });
});
