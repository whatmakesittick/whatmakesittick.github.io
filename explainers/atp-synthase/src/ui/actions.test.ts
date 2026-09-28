import { describe, expect, it } from 'vitest';
import { EVENT_IDS } from '../ids';
import { createAtpSynthaseStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('picks a ring and asks the camera to frame it again', () => {
    const store = createAtpSynthaseStore();
    CHAPTER_ACTIONS.ring.run(store.getState(), 'yeast');
    expect(store.getState()).toMatchObject({ ring: 'yeast', cameraResetToken: 1 });
    expect(CHAPTER_ACTIONS.ring.current?.(store.getState())).toBe('yeast');
  });

  it('picks each event without moving the camera', () => {
    const store = createAtpSynthaseStore();
    EVENT_IDS.forEach((id) => {
      CHAPTER_ACTIONS.event.run(store.getState(), id);
      expect(CHAPTER_ACTIONS.event.current?.(store.getState())).toBe(id);
    });
    expect(store.getState().cameraResetToken).toBe(0);
  });

  it('picks a training level and frames the longer row again', () => {
    const store = createAtpSynthaseStore();
    CHAPTER_ACTIONS.training.run(store.getState(), 'years');
    expect(store.getState()).toMatchObject({ training: 'years', cameraResetToken: 1 });
    expect(CHAPTER_ACTIONS.training.current?.(store.getState())).toBe('years');
  });

  it('keeps playing while the reader picks', () => {
    const store = createAtpSynthaseStore({ playing: true });
    CHAPTER_ACTIONS.ring.run(store.getState(), 'chloroplast');
    CHAPTER_ACTIONS.event.run(store.getState(), 'marathon');
    CHAPTER_ACTIONS.training.run(store.getState(), 'tenWeeks');
    expect(store.getState().playing).toBe(true);
  });

  it('refuses a value the chapter does not offer', () => {
    const store = createAtpSynthaseStore();
    expect(() => CHAPTER_ACTIONS.ring.run(store.getState(), 'bacteria')).toThrow();
  });
});
