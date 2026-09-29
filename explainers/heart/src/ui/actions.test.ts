import { describe, expect, it } from 'vitest';
import { WAVE_IDS } from '../ids';
import { WAVE_MOMENTS } from '../model';
import { createHeartStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('picks a chamber, a valve and a fitness and marks each as current', () => {
    const store = createHeartStore();
    CHAPTER_ACTIONS.chamber.run(store.getState(), 'rightAtrium');
    CHAPTER_ACTIONS.valve.run(store.getState(), 'aortic');
    CHAPTER_ACTIONS.fitness.run(store.getState(), 'athlete');
    expect(store.getState()).toMatchObject({
      chamber: 'rightAtrium',
      valve: 'aortic',
      fitness: 'athlete',
    });
    expect(CHAPTER_ACTIONS.chamber.current?.(store.getState())).toBe('rightAtrium');
    expect(CHAPTER_ACTIONS.valve.current?.(store.getState())).toBe('aortic');
    expect(CHAPTER_ACTIONS.fitness.current?.(store.getState())).toBe('athlete');
  });

  it('pauses on each wave of the trace and marks it as current', () => {
    const store = createHeartStore({ playing: true });
    WAVE_IDS.forEach((wave) => {
      CHAPTER_ACTIONS.wave.run(store.getState(), wave);
      expect(store.getState()).toMatchObject({ playing: false, phase: WAVE_MOMENTS[wave] });
      expect(CHAPTER_ACTIONS.wave.current?.(store.getState())).toBe(wave);
    });
  });

  it('keeps a wave current within 10 ms and marks none between the waves', () => {
    const near = createHeartStore({ phase: WAVE_MOMENTS.t + 9 }).getState();
    expect(CHAPTER_ACTIONS.wave.current?.(near)).toBe('t');
    const between = createHeartStore({ phase: 300 }).getState();
    expect(CHAPTER_ACTIONS.wave.current?.(between)).toBe('');
  });
});
