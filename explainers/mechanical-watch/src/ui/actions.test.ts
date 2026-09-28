import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { amplitude, momentPhase } from '../model';
import { createWatchStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('picks a wheel and asks the camera to frame it again', () => {
    const store = createWatchStore();
    CHAPTER_ACTIONS.wheel.run(store.getState(), 'thirdWheel');
    expect(store.getState()).toMatchObject({ wheel: 'thirdWheel', cameraResetToken: 1 });
    expect(CHAPTER_ACTIONS.wheel.current?.(store.getState())).toBe('thirdWheel');
  });

  it('pauses on each escapement moment and marks it as current', () => {
    const store = createWatchStore({ playing: true });
    MOMENT_IDS.forEach((id) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), id);
      expect(store.getState().playing).toBe(false);
      expect(store.getState().phase).toBeCloseTo(momentPhase(id, 280));
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(id);
    });
  });

  it('seeks the moments of the swing the reserve allows', () => {
    const store = createWatchStore({ reserve: 0 });
    CHAPTER_ACTIONS.moment.run(store.getState(), 'impulse');
    expect(store.getState().phase).toBeCloseTo(momentPhase('impulse', amplitude(0)));
  });

  it('marks no moment between them', () => {
    const state = createWatchStore({ phase: 200 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(state)).toBe('');
  });

  it('picks a beat rate', () => {
    const store = createWatchStore();
    CHAPTER_ACTIONS.beatRate.run(store.getState(), 'vph21600');
    expect(CHAPTER_ACTIONS.beatRate.current?.(store.getState())).toBe('vph21600');
  });

  it('winds the spring fully', () => {
    const store = createWatchStore({ reserve: 3 });
    CHAPTER_ACTIONS.wind.run(store.getState(), '');
    expect(store.getState().reserve).toBe(42);
  });
});
