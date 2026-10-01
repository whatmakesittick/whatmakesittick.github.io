import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createBlackHoleStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('picks a black hole to compare and marks it as current', () => {
    const store = createBlackHoleStore();
    CHAPTER_ACTIONS.comparison.run(store.getState(), 'm87');
    expect(store.getState().comparison).toBe('m87');
    expect(CHAPTER_ACTIONS.comparison.current?.(store.getState())).toBe('m87');
    expect(() => CHAPTER_ACTIONS.comparison.run(store.getState(), 'sun')).toThrow();
  });

  it('seeks each moment of the fall and keeps playing', () => {
    const store = createBlackHoleStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ playing: true, phase: MOMENTS[moment] });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within two seconds and marks none between them', () => {
    const near = createBlackHoleStore({ phase: MOMENTS.lightRing + 1.9 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('lightRing');
    const between = createBlackHoleStore({ phase: 300 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
  });
});
