import { describe, expect, it } from 'vitest';
import {
  BRAKE_MODE_IDS,
  CHAPTER_ACTION_IDS,
  COMPARE_IDS,
  DOCK_VIEW_IDS,
  MOMENT_IDS,
  NUDGE_IDS,
  TOP_SPEED_IDS,
} from '../ids';
import { MOMENTS } from '../model';
import { createMaglevTrainStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { MAGLEV_TRAIN_CHOICES, VIEW_TOGGLES } from './dock';

const BETWEEN_MOMENTS = 300;

function topSpeedChoice() {
  const found = MAGLEV_TRAIN_CHOICES.find((entry) => entry.id === 'topSpeed');
  if (!found) throw new Error('No topSpeed choice');
  return found;
}

describe('chapter actions and dock', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('sets the top speed from a chip or the dock and marks the one in use', () => {
    const store = createMaglevTrainStore();
    TOP_SPEED_IDS.forEach((topSpeed) => {
      CHAPTER_ACTIONS.topSpeed.run(store.getState(), topSpeed);
      expect(store.getState().topSpeed).toBe(topSpeed);
      expect(CHAPTER_ACTIONS.topSpeed.current?.(store.getState())).toBe(topSpeed);
      expect(topSpeedChoice().select(store.getState())).toBe(topSpeed);
    });
    topSpeedChoice().apply(store.getState(), 'kmh430');
    expect(store.getState().topSpeed).toBe('kmh430');
    expect(() => CHAPTER_ACTIONS.topSpeed.run(store.getState(), 'kmh500')).toThrow();
  });

  it('switches between a normal stop and a power cut', () => {
    const store = createMaglevTrainStore();
    BRAKE_MODE_IDS.forEach((brakeMode) => {
      CHAPTER_ACTIONS.brakeMode.run(store.getState(), brakeMode);
      expect(store.getState().brakeMode).toBe(brakeMode);
      expect(CHAPTER_ACTIONS.brakeMode.current?.(store.getState())).toBe(brakeMode);
    });
    expect(() => CHAPTER_ACTIONS.brakeMode.run(store.getState(), 'skid')).toThrow();
  });

  it('pushes the train once per press and never marks a nudge chip', () => {
    const store = createMaglevTrainStore();
    NUDGE_IDS.forEach((nudge) => {
      const token = store.getState().nudgeToken;
      CHAPTER_ACTIONS.nudge.run(store.getState(), nudge);
      CHAPTER_ACTIONS.nudge.run(store.getState(), nudge);
      expect(store.getState()).toMatchObject({ nudge, nudgeToken: token + 2 });
      expect(CHAPTER_ACTIONS.nudge.current?.(store.getState())).toBe('');
    });
    expect(() => CHAPTER_ACTIONS.nudge.run(store.getState(), 'shove')).toThrow();
  });

  it('picks the train to compare and marks it', () => {
    const store = createMaglevTrainStore();
    COMPARE_IDS.forEach((compare) => {
      CHAPTER_ACTIONS.compare.run(store.getState(), compare);
      expect(store.getState().compare).toBe(compare);
      expect(CHAPTER_ACTIONS.compare.current?.(store.getState())).toBe(compare);
    });
    expect(() => CHAPTER_ACTIONS.compare.run(store.getState(), 'hyperloop')).toThrow();
  });

  it('seeks to each moment, pauses there and marks its chip', () => {
    const store = createMaglevTrainStore({ phase: BETWEEN_MOMENTS, playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
    expect(() => CHAPTER_ACTIONS.moment.run(store.getState(), 'departure')).toThrow();
  });

  it('marks a moment only while paused exactly on it', () => {
    const store = createMaglevTrainStore({ phase: MOMENTS.fullSpeed, playing: false });
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('fullSpeed');
    store.getState().play();
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
    store.getState().pause();
    store.getState().setPhase(BETWEEN_MOMENTS);
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
  });

  it('offers the top speed choice and the four view toggles with their keys', () => {
    expect(MAGLEV_TRAIN_CHOICES.map((entry) => [entry.id, entry.shortcut])).toEqual([
      ['topSpeed', 'T'],
    ]);
    expect(topSpeedChoice()).toMatchObject({ labelKey: 'controls.topSpeed' });
    expect(topSpeedChoice().options).toEqual([
      { value: 'kmh430', labelKey: 'controls.topSpeedOptions.kmh430' },
      { value: 'kmh300', labelKey: 'controls.topSpeedOptions.kmh300' },
    ]);
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['wave', 'W'],
      ['gap', 'G'],
      ['ghost', 'H'],
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
