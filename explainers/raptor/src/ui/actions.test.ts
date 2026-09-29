import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model/phases';
import { createRaptorStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('picks a propellant and an engine and marks each as current', () => {
    const store = createRaptorStore();
    CHAPTER_ACTIONS.propellant.run(store.getState(), 'oxygen');
    CHAPTER_ACTIONS.engine.run(store.getState(), 'rd180');
    expect(store.getState()).toMatchObject({ propellant: 'oxygen', engine: 'rd180' });
    expect(CHAPTER_ACTIONS.propellant.current?.(store.getState())).toBe('oxygen');
    expect(CHAPTER_ACTIONS.engine.current?.(store.getState())).toBe('rd180');
  });

  it('seeks each moment of the launch and keeps playing', () => {
    const store = createRaptorStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ playing: true, phase: MOMENTS[moment] });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within half a second and marks none between them', () => {
    const near = createRaptorStore({ phase: MOMENTS.maxQ + 0.4 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('maxQ');
    const between = createRaptorStore({ phase: 90 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
  });
});
