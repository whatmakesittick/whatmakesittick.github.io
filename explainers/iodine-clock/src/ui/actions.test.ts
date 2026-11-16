import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS } from '../ids';
import { createClockStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CLOCK_CHOICES, VIEW_TOGGLES } from './dock';

describe('chapter actions and dock', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('flips the scale from a chip or the dock', () => {
    const store = createClockStore();
    const [choice] = CLOCK_CHOICES;
    expect(choice).toMatchObject({ id: 'scale', shortcut: 'M', labelKey: 'controls.scale' });
    CHAPTER_ACTIONS.scale.run(store.getState(), 'molecules');
    expect(store.getState().scale).toBe('molecules');
    expect(CHAPTER_ACTIONS.scale.current?.(store.getState())).toBe('molecules');
    choice.apply(store.getState(), 'beaker');
    expect(choice.select(store.getState())).toBe('beaker');
    expect(() => CHAPTER_ACTIONS.scale.run(store.getState(), 'atoms')).toThrow();
  });

  it('mixes again from the start and never marks the chip', () => {
    const store = createClockStore({ phase: 700, playing: false });
    CHAPTER_ACTIONS.mix.run(store.getState(), 'again');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
    expect(CHAPTER_ACTIONS.mix.current?.(store.getState())).toBe('');
    expect(() => CHAPTER_ACTIONS.mix.run(store.getState(), 'twice')).toThrow();
  });

  it('offers the water and labels toggles with their keys', () => {
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['water', 'W'],
      ['labels', 'L'],
    ]);
    VIEW_TOGGLES.forEach((toggle) =>
      expect(toggle.nameKey).toBe(`controls.views.${toggle.view}.name`),
    );
  });
});
