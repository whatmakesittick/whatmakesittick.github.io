import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import { EFFORT_RANGE } from './ranges';
import { DEFAULT_VIEW, createHeartStore } from './store';

const CHAPTERS = Object.keys(PRESETS) as PresetId[];

function othersThan(kept: PresetId): PresetId[] {
  return CHAPTERS.filter((id) => id !== kept);
}

describe('heart store', () => {
  it('starts on the overview with the whole heart, the blood flow and the left ventricle picked', () => {
    expect(createHeartStore().getState()).toMatchObject({
      phase: 0,
      speed: 2,
      preset: 'overview',
      chamber: 'leftVentricle',
      valve: 'mitral',
      effort: 0,
      fitness: 'typical',
      view: { cutaway: false, flow: true, conduction: false, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('plays one beat in 6.4 seconds at the start and wraps to the next beat', () => {
    const store = createHeartStore({ phase: 700, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(25);
  });

  it('keeps the effort inside its range', () => {
    const store = createHeartStore();
    store.getState().setEffort(2);
    expect(store.getState().effort).toBe(EFFORT_RANGE.max);
    store.getState().setEffort(-1);
    expect(store.getState().effort).toBe(EFFORT_RANGE.min);
  });

  it('picks a chamber, a valve and a fitness', () => {
    const store = createHeartStore();
    store.getState().setChamber('rightAtrium');
    store.getState().setValve('aortic');
    store.getState().setFitness('athlete');
    expect(store.getState()).toMatchObject({
      chamber: 'rightAtrium',
      valve: 'aortic',
      fitness: 'athlete',
    });
  });

  it('keeps each chapter control in its chapter and resets it elsewhere', () => {
    const store = createHeartStore();
    const state = () => store.getState();
    const cases = [
      { id: 'chambers', set: () => state().setChamber('rightAtrium'), read: () => state().chamber },
      { id: 'valves', set: () => state().setValve('pulmonary'), read: () => state().valve },
      { id: 'circulation', set: () => state().setEffort(0.6), read: () => state().effort },
      { id: 'circulation', set: () => state().setFitness('athlete'), read: () => state().fitness },
    ] as const;
    cases.forEach(({ id, set, read }) => {
      state().applyPreset(id);
      set();
      const kept = read();
      state().applyPreset(id);
      expect(read(), id).toBe(kept);
      othersThan(id).forEach((other) => {
        state().applyPreset(id);
        set();
        state().applyPreset(other);
        expect(read(), `${id} to ${other}`).not.toBe(kept);
      });
    });
  });

  it('starts the beat again for the cycle and the conduction chapters', () => {
    const store = createHeartStore({ phase: 420, playing: true });
    store.getState().applyPreset('cycle');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true, speed: 1 });
    store.getState().setPhase(300);
    store.getState().applyPreset('conduction');
    expect(store.getState()).toMatchObject({ phase: 0, speed: 0 });
    expect(store.getState().view).toMatchObject({ cutaway: true, flow: false, conduction: true });
  });

  it('closes the heart again and hides the electrical system for the circulation', () => {
    const store = createHeartStore();
    store.getState().applyPreset('conduction');
    store.getState().applyPreset('circulation');
    expect(store.getState().view).toMatchObject({ cutaway: false, flow: true, conduction: false });
    expect(store.getState().speed).toBe(3);
  });

  it('keeps the labels through the chapters', () => {
    const store = createHeartStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});
