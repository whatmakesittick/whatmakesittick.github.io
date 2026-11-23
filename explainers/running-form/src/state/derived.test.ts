import { describe, expect, it } from 'vitest';
import { gaitAt } from '../model';
import { createRunStore } from './store';
import { createAssemblyState, gaitReading, toAssemblyState } from './derived';

describe('derived state', () => {
  it('reads the gait model once for the same inputs', () => {
    const { phase, pace, stepRate, arms } = createRunStore().getState();
    const first = gaitReading({ phase, pace, stepRate, arms });
    expect(gaitReading({ phase, pace, stepRate, arms })).toBe(first);
    expect(gaitReading({ phase: phase + 2, pace, stepRate, arms })).not.toBe(first);
    expect(first).toEqual(gaitAt(phase, { pace, stepRate, arms }));
  });

  it('builds the assembly state from the store without a scroll', () => {
    const state = createRunStore({ phase: 300, playing: false }).getState();
    const assembly = createAssemblyState(state);
    expect(assembly).toMatchObject({
      phase: 300,
      playing: false,
      pace: 'steady',
      stepRate: 0,
      arms: 'swing',
      scrollM: 0,
    });
    expect(assembly.reading.units).toBe(300);
    expect(assembly.view).toEqual(state.view);
    expect(assembly.view).not.toBe(state.view);
  });

  it('rewrites a target in place with the new reading and flags', () => {
    const store = createRunStore();
    const target = createAssemblyState(store.getState());
    const view = target.view;
    store.getState().setStepRate(5);
    store.getState().toggleView('forces');
    const written = toAssemblyState(store.getState(), target);
    expect(written).toBe(target);
    expect(written.view).toBe(view);
    expect(written.stepRate).toBe(5);
    expect(written.view.forces).toBe(true);
    expect(written.reading.stepRate).toBe(5);
  });
});
