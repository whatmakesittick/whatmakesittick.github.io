import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS } from '../ids';
import { createSwimStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

function stateOf() {
  return createSwimStore().getState();
}

describe('chapter actions', () => {
  it('has one action per id', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('sets the pace and the kick and reports the effective kick', () => {
    const store = createSwimStore();
    CHAPTER_ACTIONS.pace.run(store.getState(), 'easy');
    expect(CHAPTER_ACTIONS.pace.current?.(store.getState())).toBe('easy');
    expect(CHAPTER_ACTIONS.kick.current?.(store.getState())).toBe('two');
    CHAPTER_ACTIONS.kick.run(store.getState(), 'six');
    expect(CHAPTER_ACTIONS.kick.current?.(store.getState())).toBe('six');
  });

  it('sets the breathing and the head', () => {
    const store = createSwimStore();
    CHAPTER_ACTIONS.breath.run(store.getState(), 'right');
    CHAPTER_ACTIONS.head.run(store.getState(), 'up');
    expect(store.getState()).toMatchObject({ breathing: 'right', headUp: true });
    expect(CHAPTER_ACTIONS.head.current?.(store.getState())).toBe('up');
    CHAPTER_ACTIONS.head.run(store.getState(), 'down');
    expect(CHAPTER_ACTIONS.head.current?.(store.getState())).toBe('down');
  });

  it('rejects values outside the lists', () => {
    expect(() => CHAPTER_ACTIONS.pace.run(stateOf(), 'fast')).toThrow();
    expect(() => CHAPTER_ACTIONS.head.run(stateOf(), 'sideways')).toThrow();
  });
});
