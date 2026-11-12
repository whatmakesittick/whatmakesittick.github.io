import { describe, expect, it } from 'vitest';
import { CHAPTER_ACTION_IDS, MACHINE_IDS, MOMENT_IDS } from '../ids';
import { BOUNCES, MOMENTS, unitsAfterBounce } from '../model';
import { createEuvStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';

describe('chapter actions', () => {
  it('covers every chapter action', () => {
    expect(Object.keys(CHAPTER_ACTIONS)).toEqual([...CHAPTER_ACTION_IDS]);
  });

  it('jumps to a moment, pauses and marks it as current', () => {
    const store = createEuvStore();
    MOMENT_IDS.forEach((moment) => {
      CHAPTER_ACTIONS.moment.run(store.getState(), moment);
      expect(store.getState().phase).toBe(MOMENTS[moment]);
      expect(store.getState().playing).toBe(false);
      expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe(moment);
    });
  });

  it('marks no moment between moments', () => {
    const store = createEuvStore({ phase: 123 });
    expect(CHAPTER_ACTIONS.moment.current?.(store.getState())).toBe('');
  });

  it('jumps to each bounce count, pauses and marks it', () => {
    const store = createEuvStore();
    for (let count = 0; count <= BOUNCES; count += 1) {
      CHAPTER_ACTIONS.bounce.run(store.getState(), String(count));
      expect(store.getState().phase).toBe(unitsAfterBounce(count));
      expect(store.getState().playing).toBe(false);
      expect(CHAPTER_ACTIONS.bounce.current?.(store.getState())).toBe(String(count));
    }
  });

  it('rejects an unknown moment or bounce count', () => {
    const state = createEuvStore().getState();
    expect(() => CHAPTER_ACTIONS.moment.run(state, 'nowhere')).toThrow();
    expect(() => CHAPTER_ACTIONS.bounce.run(state, String(BOUNCES + 1))).toThrow();
    expect(() => CHAPTER_ACTIONS.bounce.run(state, '-1')).toThrow();
    expect(() => CHAPTER_ACTIONS.bounce.run(state, '1.5')).toThrow();
    expect(() => CHAPTER_ACTIONS.bounce.run(state, 'two')).toThrow();
  });

  it('picks the machine and marks it', () => {
    const store = createEuvStore();
    MACHINE_IDS.forEach((machine) => {
      CHAPTER_ACTIONS.machine.run(store.getState(), machine);
      expect(store.getState().machine).toBe(machine);
      expect(CHAPTER_ACTIONS.machine.current?.(store.getState())).toBe(machine);
    });
    expect(() => CHAPTER_ACTIONS.machine.run(store.getState(), 'nxe0')).toThrow();
  });
});
