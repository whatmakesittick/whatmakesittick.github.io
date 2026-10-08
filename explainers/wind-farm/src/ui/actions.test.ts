import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS, SITE_WIND_IDS, SPACING_CHOICE_IDS, WIND_PRESET_IDS } from '../ids';
import { WIND_PRESETS } from '../model';
import { createWindFarmStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

const OFF_PRESET_WIND = 9.5;

describe('chapter actions', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('switches the site wind', () => {
    const store = createWindFarmStore();
    SITE_WIND_IDS.forEach((site) => {
      CHAPTER_ACTIONS.siteWind.run(store.getState(), site);
      expect(store.getState().siteWind).toBe(site);
      expect(CHAPTER_ACTIONS.siteWind.current?.(store.getState())).toBe(site);
    });
  });

  it('switches the row spacing', () => {
    const store = createWindFarmStore();
    SPACING_CHOICE_IDS.forEach((choice) => {
      CHAPTER_ACTIONS.spacing.run(store.getState(), choice);
      expect(store.getState().spacing).toBe(Number(choice));
      expect(CHAPTER_ACTIONS.spacing.current?.(store.getState())).toBe(choice);
    });
    expect(() => CHAPTER_ACTIONS.spacing.run(store.getState(), '6')).toThrow();
  });

  it('opens and closes the nacelle', () => {
    const store = createWindFarmStore();
    CHAPTER_ACTIONS.nacelle.run(store.getState(), 'open');
    expect(store.getState().view.cutaway).toBe(true);
    expect(CHAPTER_ACTIONS.nacelle.current?.(store.getState())).toBe('open');
    CHAPTER_ACTIONS.nacelle.run(store.getState(), 'closed');
    expect(store.getState().view.cutaway).toBe(false);
    expect(CHAPTER_ACTIONS.nacelle.current?.(store.getState())).toBe('closed');
  });

  it('pins the wind to a preset or hands it back to the day', () => {
    const store = createWindFarmStore();
    WIND_PRESET_IDS.forEach((preset) => {
      CHAPTER_ACTIONS.windAt.run(store.getState(), preset);
      expect(store.getState().windOverride).toBe(WIND_PRESETS[preset]);
      expect(CHAPTER_ACTIONS.windAt.current?.(store.getState())).toBe(preset);
    });
    CHAPTER_ACTIONS.windAt.run(store.getState(), 'day');
    expect(store.getState().windOverride).toBeNull();
    expect(CHAPTER_ACTIONS.windAt.current?.(store.getState())).toBe('day');
  });

  it('marks no wind chip for a wind that matches no preset', () => {
    const store = createWindFarmStore();
    store.getState().setWindOverride(OFF_PRESET_WIND);
    expect(CHAPTER_ACTIONS.windAt.current?.(store.getState())).toBe('');
  });
});
