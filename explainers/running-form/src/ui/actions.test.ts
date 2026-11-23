import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS } from '../ids';
import { createRunStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('has one action per id', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('sets the pace, the arms and the view and reports them', () => {
    const store = createRunStore();
    CHAPTER_ACTIONS.pace.run(store.getState(), 'fast');
    CHAPTER_ACTIONS.arms.run(store.getState(), 'held');
    CHAPTER_ACTIONS.look.run(store.getState(), 'above');
    expect(store.getState()).toMatchObject({ pace: 'fast', arms: 'held', lookFrom: 'above' });
    expect(CHAPTER_ACTIONS.pace.current?.(store.getState())).toBe('fast');
    expect(CHAPTER_ACTIONS.arms.current?.(store.getState())).toBe('held');
    expect(CHAPTER_ACTIONS.look.current?.(store.getState())).toBe('above');
  });

  it('rejects values outside the lists', () => {
    const state = createRunStore().getState();
    expect(() => CHAPTER_ACTIONS.pace.run(state, 'sprint')).toThrow();
    expect(() => CHAPTER_ACTIONS.arms.run(state, 'folded')).toThrow();
    expect(() => CHAPTER_ACTIONS.look.run(state, 'behind')).toThrow();
  });
});
