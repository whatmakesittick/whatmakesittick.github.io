import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS, GAS_IDS, MOMENT_IDS, TANK_CHOICE_IDS } from '../ids';
import { MOMENTS, TANK_LITRES } from '../model';
import { createThrusterCarStore } from '../state';
import { CHAPTER_ACTIONS, MOMENT_TOLERANCE_S } from './actions';
import { THRUSTER_CAR_CHOICES, VIEW_TOGGLES } from './dock';

function choice(id: string) {
  const found = THRUSTER_CAR_CHOICES.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} choice`);
  return found;
}

describe('chapter actions and dock', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('swaps the gas from a chip or the dock and marks the one in the tank', () => {
    const store = createThrusterCarStore();
    GAS_IDS.forEach((gas) => {
      CHAPTER_ACTIONS.gas.run(store.getState(), gas);
      expect(store.getState().gas).toBe(gas);
      expect(CHAPTER_ACTIONS.gas.current?.(store.getState())).toBe(gas);
      expect(choice('gas').select(store.getState())).toBe(gas);
    });
    choice('gas').apply(store.getState(), 'air');
    expect(store.getState().gas).toBe('air');
    expect(() => CHAPTER_ACTIONS.gas.run(store.getState(), 'hydrogen')).toThrow();
  });

  it('swaps the tank size from a chip or the dock', () => {
    const store = createThrusterCarStore();
    TANK_CHOICE_IDS.forEach((id) => {
      CHAPTER_ACTIONS.tank.run(store.getState(), id);
      expect(store.getState().tankLitres).toBe(TANK_LITRES[id]);
      expect(CHAPTER_ACTIONS.tank.current?.(store.getState())).toBe(id);
      expect(choice('tank').select(store.getState())).toBe(id);
    });
    choice('tank').apply(store.getState(), '600');
    expect(store.getState().tankLitres).toBe(TANK_LITRES['600']);
    expect(() => CHAPTER_ACTIONS.tank.run(store.getState(), '500')).toThrow();
  });

  it('replays the run from the start and marks no chip', () => {
    const store = createThrusterCarStore({ phase: 8, playing: false });
    expect(CHAPTER_ACTIONS.replay.current?.(store.getState())).toBe('');
    CHAPTER_ACTIONS.replay.run(store.getState(), 'run');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
    expect(CHAPTER_ACTIONS.replay.current?.(store.getState())).toBe('');
    expect(() => CHAPTER_ACTIONS.replay.run(store.getState(), 'again')).toThrow();
  });

  it('seeks to each moment, pauses there and marks its chip', () => {
    const store = createThrusterCarStore({ phase: 1, playing: true });
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
    expect(() => CHAPTER_ACTIONS.moment.run(store.getState(), 'liftoff')).toThrow();
  });

  it('marks a moment only within its tolerance', () => {
    const store = createThrusterCarStore({ phase: MOMENTS.apex + MOMENT_TOLERANCE_S / 2 });
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('apex');
    store.getState().setPhase(MOMENTS.apex + MOMENT_TOLERANCE_S * 2);
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
  });

  it('offers the gas and tank choices and the five view toggles with their keys', () => {
    expect(THRUSTER_CAR_CHOICES.map((entry) => [entry.id, entry.shortcut])).toEqual([
      ['gas', 'A'],
      ['tank', 'V'],
    ]);
    expect(choice('gas').options.map((option) => option.value)).toEqual([...GAS_IDS]);
    expect(choice('tank').options).toEqual([
      { value: '400', labelKey: 'controls.tankOptions.400' },
      { value: '600', labelKey: 'controls.tankOptions.600' },
    ]);
    expect(VIEW_TOGGLES.map((toggle) => [toggle.view, toggle.shortcut])).toEqual([
      ['nozzles', 'N'],
      ['forces', 'F'],
      ['tank', 'T'],
      ['ghost', 'G'],
      ['labels', 'L'],
    ]);
    VIEW_TOGGLES.forEach((toggle) =>
      expect(toggle.hintKey).toBe(`controls.views.${toggle.view}.hint`),
    );
  });
});
