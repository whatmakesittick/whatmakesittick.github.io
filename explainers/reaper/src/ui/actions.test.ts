import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createReaperStore } from '../state';
import { CHAPTER_ACTIONS, MOMENT_TOLERANCE_UNITS } from './actions';

describe('chapter actions', () => {
  it('pauses at each moment and marks it as current', () => {
    const store = createReaperStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState().playing).toBe(false);
      expect(store.getState().phase).toBeCloseTo(MOMENTS[moment], 9);
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('keeps a moment current within its tolerance and marks none between them', () => {
    const near = createReaperStore({ phase: MOMENTS.onStation + 0.25 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(near)).toBe('onStation');
    const past = createReaperStore({ phase: MOMENTS.onStation + 0.4 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(past)).toBe('');
    const between = createReaperStore({ phase: 50 }).getState();
    expect(CHAPTER_ACTIONS.moment.current?.(between)).toBe('');
    expect(() => CHAPTER_ACTIONS.moment.run(between, 'landing')).toThrow();
  });

  it('never marks two moments at once', () => {
    const units = MOMENT_IDS.map((moment) => MOMENTS[moment]);
    units
      .slice(1)
      .forEach((next, index) =>
        expect(next - units[index], MOMENT_IDS[index + 1]).toBeGreaterThan(
          2 * MOMENT_TOLERANCE_UNITS,
        ),
      );
  });

  it('switches the load, the comparison and the sensor mode', () => {
    const store = createReaperStore();
    CHAPTER_ACTIONS.load.run(store.getState(), 'clean');
    CHAPTER_ACTIONS.comparison.run(store.getState(), 'cessna');
    CHAPTER_ACTIONS.sensorMode.run(store.getState(), 'laser');
    expect(store.getState()).toMatchObject({
      load: 'clean',
      comparison: 'cessna',
      sensorMode: 'laser',
    });
    expect(CHAPTER_ACTIONS.load.current?.(store.getState())).toBe('clean');
    expect(CHAPTER_ACTIONS.comparison.current?.(store.getState())).toBe('cessna');
    expect(CHAPTER_ACTIONS.sensorMode.current?.(store.getState())).toBe('laser');
    expect(() => CHAPTER_ACTIONS.sensorMode.run(store.getState(), 'radar')).toThrow();
  });
});
