import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ACTION_IDS,
  COMPARE_IDS,
  DOCK_VIEW_IDS,
  MOMENT_IDS,
  PEDAL_IDS,
  REGISTER_IDS,
  TOUCH_IDS,
} from '../ids';
import { MOMENTS } from '../model';
import { createPianoStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { PIANO_CHOICES, VIEW_TOGGLES } from './dock';

const BETWEEN_MOMENTS = 500;

function choice(id: string) {
  const found = PIANO_CHOICES.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} choice`);
  return found;
}

describe('chapter actions and dock', () => {
  it('covers every chapter action, each with a current value', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
    Object.values(CHAPTER_ACTIONS).forEach((action) => expect(action.current).toBeDefined());
  });

  it('sets the touch from a chip or the dock and marks the one in use', () => {
    const store = createPianoStore();
    TOUCH_IDS.forEach((touch) => {
      CHAPTER_ACTIONS.touch.run(store.getState(), touch);
      expect(store.getState().touch).toBe(touch);
      expect(CHAPTER_ACTIONS.touch.current?.(store.getState())).toBe(touch);
      expect(choice('touch').select(store.getState())).toBe(touch);
    });
    choice('touch').apply(store.getState(), 'soft');
    expect(store.getState().touch).toBe('soft');
    expect(() => CHAPTER_ACTIONS.touch.run(store.getState(), 'forte')).toThrow();
  });

  it('sets the pedal from a chip or the dock and marks the one in use', () => {
    const store = createPianoStore();
    PEDAL_IDS.forEach((pedal) => {
      CHAPTER_ACTIONS.pedal.run(store.getState(), pedal);
      expect(store.getState().pedal).toBe(pedal);
      expect(CHAPTER_ACTIONS.pedal.current?.(store.getState())).toBe(pedal);
      expect(choice('pedal').select(store.getState())).toBe(pedal);
    });
    choice('pedal').apply(store.getState(), 'none');
    expect(store.getState().pedal).toBe('none');
    expect(() => CHAPTER_ACTIONS.pedal.run(store.getState(), 'sostenuto')).toThrow();
  });

  it('picks the note to play and marks it', () => {
    const store = createPianoStore();
    REGISTER_IDS.forEach((register) => {
      CHAPTER_ACTIONS.register.run(store.getState(), register);
      expect(store.getState().register).toBe(register);
      expect(CHAPTER_ACTIONS.register.current?.(store.getState())).toBe(register);
    });
    expect(() => CHAPTER_ACTIONS.register.run(store.getState(), 'tenor')).toThrow();
  });

  it('picks the instrument to compare and marks it', () => {
    const store = createPianoStore();
    COMPARE_IDS.forEach((compare) => {
      CHAPTER_ACTIONS.compare.run(store.getState(), compare);
      expect(store.getState().compare).toBe(compare);
      expect(CHAPTER_ACTIONS.compare.current?.(store.getState())).toBe(compare);
    });
    expect(() => CHAPTER_ACTIONS.compare.run(store.getState(), 'clavichord')).toThrow();
  });

  it('seeks to each moment, pauses there and marks its chip', () => {
    const store = createPianoStore({ phase: BETWEEN_MOMENTS, playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
    expect(() => CHAPTER_ACTIONS.moment.run(store.getState(), 'touchdown')).toThrow();
  });

  it('marks a moment only while paused exactly on it', () => {
    const store = createPianoStore({ phase: MOMENTS.strike, playing: false });
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('strike');
    store.getState().play();
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
    store.getState().pause();
    store.getState().setPhase(BETWEEN_MOMENTS);
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
  });

  it('turns the sound on and off through the view and marks the chip in use', () => {
    const store = createPianoStore();
    expect(CHAPTER_ACTIONS.sound.current?.(store.getState())).toBe('off');
    CHAPTER_ACTIONS.sound.run(store.getState(), 'on');
    expect(store.getState().view.sound).toBe(true);
    expect(CHAPTER_ACTIONS.sound.current?.(store.getState())).toBe('on');
    store.getState().toggleView('sound');
    expect(CHAPTER_ACTIONS.sound.current?.(store.getState())).toBe('off');
    CHAPTER_ACTIONS.sound.run(store.getState(), 'on');
    CHAPTER_ACTIONS.sound.run(store.getState(), 'off');
    expect(store.getState().view.sound).toBe(false);
    expect(store.getState().view.labels).toBe(true);
    expect(() => CHAPTER_ACTIONS.sound.run(store.getState(), 'loud')).toThrow();
  });

  it('offers the touch and pedal choices and the six view toggles with their keys', () => {
    expect(PIANO_CHOICES.map((entry) => [entry.id, entry.shortcut])).toEqual([
      ['touch', 'T'],
      ['pedal', 'P'],
    ]);
    expect(choice('touch')).toMatchObject({ labelKey: 'controls.touch' });
    expect(choice('touch').options).toEqual(
      TOUCH_IDS.map((id) => ({ value: id, labelKey: `controls.touchOptions.${id}` })),
    );
    expect(choice('pedal')).toMatchObject({ labelKey: 'controls.pedal' });
    expect(choice('pedal').options).toEqual(
      PEDAL_IDS.map((id) => ({ value: id, labelKey: `controls.pedalOptions.${id}` })),
    );
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['sound', 'S'],
      ['wave', 'W'],
      ['inset', 'I'],
      ['ghost', 'G'],
      ['follow', 'F'],
      ['labels', 'L'],
    ]);
    expect(VIEW_TOGGLES.map((toggle) => toggle.view)).toEqual([...DOCK_VIEW_IDS]);
    VIEW_TOGGLES.forEach((toggle) => {
      expect(toggle).toMatchObject({
        nameKey: `controls.views.${toggle.view}.name`,
        shortKey: `controls.views.${toggle.view}.short`,
        hintKey: `controls.views.${toggle.view}.hint`,
      });
      expect(toggle.icon).toContain('<path');
    });
  });
});
