import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_IDS,
  CHAPTER_ACTION_IDS,
  COOLING_IDS,
  DISTANCE_IDS,
  DOCK_VIEW_IDS,
  LOAD_IDS,
  MOMENT_IDS,
} from '../ids';
import { MOMENTS } from '../model';
import { createDataCenterStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { DATA_CENTER_CHOICES, VIEW_TOGGLES } from './dock';

const BETWEEN_MOMENTS = 300;

function choice(id: string) {
  const found = DATA_CENTER_CHOICES.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} choice`);
  return found;
}

describe('chapter actions and dock', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('sets the cooling from a chip or the dock and marks the one in use', () => {
    const store = createDataCenterStore();
    COOLING_IDS.forEach((cooling) => {
      CHAPTER_ACTIONS.cooling.run(store.getState(), cooling);
      expect(store.getState().cooling).toBe(cooling);
      expect(CHAPTER_ACTIONS.cooling.current?.(store.getState())).toBe(cooling);
      expect(choice('cooling').select(store.getState())).toBe(cooling);
    });
    choice('cooling').apply(store.getState(), 'liquid');
    expect(store.getState().cooling).toBe('liquid');
    expect(() => CHAPTER_ACTIONS.cooling.run(store.getState(), 'oil')).toThrow();
  });

  it('sets the load from a chip or the dock and marks the one in use', () => {
    const store = createDataCenterStore();
    LOAD_IDS.forEach((load) => {
      CHAPTER_ACTIONS.load.run(store.getState(), load);
      expect(store.getState().load).toBe(load);
      expect(CHAPTER_ACTIONS.load.current?.(store.getState())).toBe(load);
      expect(choice('load').select(store.getState())).toBe(load);
    });
    choice('load').apply(store.getState(), 'full');
    expect(store.getState().load).toBe('full');
    expect(() => CHAPTER_ACTIONS.load.run(store.getState(), 'half')).toThrow();
  });

  it('picks the distance and the benchmark and marks them', () => {
    const store = createDataCenterStore();
    DISTANCE_IDS.forEach((distance) => {
      CHAPTER_ACTIONS.distance.run(store.getState(), distance);
      expect(store.getState().distance).toBe(distance);
      expect(CHAPTER_ACTIONS.distance.current?.(store.getState())).toBe(distance);
    });
    BENCHMARK_IDS.forEach((benchmark) => {
      CHAPTER_ACTIONS.benchmark.run(store.getState(), benchmark);
      expect(store.getState().benchmark).toBe(benchmark);
      expect(CHAPTER_ACTIONS.benchmark.current?.(store.getState())).toBe(benchmark);
    });
    expect(() => CHAPTER_ACTIONS.distance.run(store.getState(), 'km10')).toThrow();
    expect(() => CHAPTER_ACTIONS.benchmark.run(store.getState(), 'worst')).toThrow();
  });

  it('cuts the grid once per press and never marks the drill chip', () => {
    const store = createDataCenterStore();
    const token = store.getState().outageToken;
    CHAPTER_ACTIONS.outage.run(store.getState(), 'cut');
    CHAPTER_ACTIONS.outage.run(store.getState(), 'cut');
    expect(store.getState().outageToken).toBe(token + 2);
    expect(CHAPTER_ACTIONS.outage.current?.(store.getState())).toBe('');
    expect(() => CHAPTER_ACTIONS.outage.run(store.getState(), 'restore')).toThrow();
    expect(store.getState().outageToken).toBe(token + 2);
  });

  it('seeks to each moment, pauses there and marks its chip', () => {
    const store = createDataCenterStore({ phase: BETWEEN_MOMENTS, playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
    expect(() => CHAPTER_ACTIONS.moment.run(store.getState(), 'atGrid')).toThrow();
  });

  it('marks a moment only while paused exactly on it', () => {
    const store = createDataCenterStore({ phase: MOMENTS.inCoolant, playing: false });
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('inCoolant');
    store.getState().play();
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
    store.getState().pause();
    store.getState().setPhase(BETWEEN_MOMENTS);
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
  });

  it('offers the cooling and load choices and the six view toggles with their keys', () => {
    expect(DATA_CENTER_CHOICES.map((entry) => [entry.id, entry.shortcut, entry.labelKey])).toEqual([
      ['cooling', 'W', 'controls.cooling'],
      ['load', 'D', 'controls.load'],
    ]);
    expect(choice('cooling').options).toEqual([
      { value: 'liquid', labelKey: 'controls.coolingOptions.liquid' },
      { value: 'air', labelKey: 'controls.coolingOptions.air' },
    ]);
    expect(choice('load').options).toEqual([
      { value: 'full', labelKey: 'controls.loadOptions.full' },
      { value: 'idle', labelKey: 'controls.loadOptions.idle' },
    ]);
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['power', 'P'],
      ['heat', 'H'],
      ['packets', 'N'],
      ['labels', 'L'],
      ['cutaway', 'C'],
      ['follow', 'F'],
    ]);
    expect(VIEW_TOGGLES.map((toggle) => toggle.view)).toEqual([...DOCK_VIEW_IDS]);
    VIEW_TOGGLES.forEach((toggle) => {
      expect(toggle).toMatchObject({
        nameKey: `controls.views.${toggle.view}.name`,
        shortKey: `controls.views.${toggle.view}.short`,
        hintKey: `controls.views.${toggle.view}.hint`,
      });
      expect(toggle.icon).toMatch(/<(path|rect|circle)/);
    });
  });
});
