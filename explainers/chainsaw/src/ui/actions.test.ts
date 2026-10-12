import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS, THROTTLE_CHOICE_IDS } from '../ids';
import { THROTTLE_PRESETS } from '../model';
import { createChainsawStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAINSAW_CHOICES, VIEW_TOGGLES } from './dock';

describe('chapter actions and dock', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('sets the throttle from a chip or the dock and marks none between presets', () => {
    const store = createChainsawStore();
    const [choice] = CHAINSAW_CHOICES;
    THROTTLE_CHOICE_IDS.forEach((id) => {
      CHAPTER_ACTIONS.throttle.run(store.getState(), id);
      expect(store.getState().throttle).toBe(THROTTLE_PRESETS[id]);
      expect(CHAPTER_ACTIONS.throttle.current?.(store.getState())).toBe(id);
      expect(choice.select(store.getState())).toBe(id);
    });
    store.getState().setThrottle(0.3);
    expect(CHAPTER_ACTIONS.throttle.current?.(store.getState())).toBe('');
    choice.apply(store.getState(), 'idle');
    expect(store.getState().throttle).toBe(0);
    expect(() => CHAPTER_ACTIONS.throttle.run(store.getState(), 'max')).toThrow();
  });

  it('sets the brake and starts a kickback', () => {
    const store = createChainsawStore();
    CHAPTER_ACTIONS.brake.run(store.getState(), 'on');
    expect(store.getState().brake).toBe(true);
    expect(CHAPTER_ACTIONS.brake.current?.(store.getState())).toBe('on');
    expect(CHAPTER_ACTIONS.kickback.current?.(store.getState())).toBe('');
    CHAPTER_ACTIONS.kickback.run(store.getState(), 'strong');
    expect(store.getState()).toMatchObject({ kickback: true, brake: false });
    expect(CHAPTER_ACTIONS.kickback.current?.(store.getState())).toBe('strong');
  });

  it('offers the four view toggles with their keys', () => {
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['cutaway', 'C'],
      ['flow', 'F'],
      ['zone', 'K'],
      ['labels', 'L'],
    ]);
    expect(CHAINSAW_CHOICES[0].shortcut).toBe('T');
  });
});
