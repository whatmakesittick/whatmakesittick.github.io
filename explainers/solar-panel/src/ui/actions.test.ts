import { describe, expect, it } from 'vitest';
import { SUN_MOMENT_IDS } from '../ids';
import { SUN_MOMENTS } from '../model';
import { createSolarPanelStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('pauses on each sun moment and marks it as current', () => {
    const store = createSolarPanelStore({ playing: true });
    SUN_MOMENT_IDS.forEach((id) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), id);
      expect(store.getState()).toMatchObject({ playing: false, phase: SUN_MOMENTS[id] });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(id);
    });
  });

  it('keeps a moment current within a minute and marks none between them', () => {
    const near = createSolarPanelStore({ phase: SUN_MOMENTS.noon + 0.8 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('noon');
    const between = createSolarPanelStore({ phase: 300 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
  });

  it('picks a layer and a layout', () => {
    const store = createSolarPanelStore();
    CHAPTER_ACTIONS.layer.run(store.getState(), 'junctionBox');
    CHAPTER_ACTIONS.layout.run(store.getState(), 'fullCell');
    expect(CHAPTER_ACTIONS.layer.current?.(store.getState())).toBe('junctionBox');
    expect(CHAPTER_ACTIONS.layout.current?.(store.getState())).toBe('fullCell');
  });

  it('lets the cell temperature follow the day again', () => {
    const store = createSolarPanelStore({ temperature: 70 });
    CHAPTER_ACTIONS.followDay.run(store.getState(), '');
    expect(store.getState().temperature).toBeNull();
  });
});
