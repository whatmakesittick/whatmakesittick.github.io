import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { MOMENTS, msAt, unitsAt } from '../model';
import { createRifleStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('pauses at each moment and marks it as current', () => {
    const store = createRifleStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState().playing).toBe(false);
      expect(msAt(store.getState().phase)).toBeCloseTo(MOMENTS[moment], 9);
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within half a unit and marks none between them', () => {
    const near = createRifleStore({ phase: unitsAt(MOMENTS.unlock) + 0.4 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('unlock');
    const between = createRifleStore({ phase: 85 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
    expect(() => CHAPTER_ACTIONS.moment.run(between, 'reload')).toThrow();
  });

  it('opens and blocks the gas port', () => {
    const store = createRifleStore();
    CHAPTER_ACTIONS.gasPort.run(store.getState(), 'blocked');
    expect(store.getState().gasPort).toBe('blocked');
    expect(CHAPTER_ACTIONS.gasPort.current?.(store.getState())).toBe('blocked');
    expect(() => CHAPTER_ACTIONS.gasPort.run(store.getState(), 'half')).toThrow();
  });

  it('picks what to compare one cycle with', () => {
    const store = createRifleStore();
    CHAPTER_ACTIONS.comparison.run(store.getState(), 'sound');
    expect(store.getState().comparison).toBe('sound');
    expect(CHAPTER_ACTIONS.comparison.current?.(store.getState())).toBe('sound');
    expect(() => CHAPTER_ACTIONS.comparison.run(store.getState(), 'train')).toThrow();
  });
});
