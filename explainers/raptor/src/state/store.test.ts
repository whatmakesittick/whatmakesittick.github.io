import { describe, expect, it } from 'vitest';
import { phaseAtAltitude } from '../model';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import { DEFAULT_VIEW, createRaptorStore } from './store';

const CHAPTERS = Object.keys(PRESETS) as PresetId[];

function othersThan(kept: PresetId): PresetId[] {
  return CHAPTERS.filter((id) => id !== kept);
}

describe('raptor store', () => {
  it('starts on the overview at the start command with the engine closed and firing', () => {
    expect(createRaptorStore().getState()).toMatchObject({
      phase: 0,
      speed: 3,
      preset: 'overview',
      propellant: 'methane',
      engine: 'raptor',
      view: { cutaway: false, flow: false, flame: true, cluster: false, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('plays the burn in real time and stops at the end of the run', () => {
    const store = createRaptorStore({ phase: 10, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(11);
    store.getState().setPhase(144.5);
    store.getState().tick(1);
    expect(store.getState()).toMatchObject({ phase: 145, playing: false });
  });

  it('picks a propellant and an engine', () => {
    const store = createRaptorStore();
    store.getState().setPropellant('oxygen');
    store.getState().setEngine('rs25');
    expect(store.getState()).toMatchObject({ propellant: 'oxygen', engine: 'rs25' });
  });

  it('pauses the flight at the moment it reaches a height', () => {
    const store = createRaptorStore({ playing: true });
    store.getState().seekAltitude(8.4);
    expect(store.getState().playing).toBe(false);
    expect(store.getState().phase).toBeCloseTo(phaseAtAltitude(8.4));
    expect(store.getState().phase).toBeCloseTo(63, 0);
  });

  it('keeps each chapter control in its chapter and resets it elsewhere', () => {
    const store = createRaptorStore();
    const state = () => store.getState();
    const cases = [
      {
        id: 'propellants',
        set: () => state().setPropellant('oxygen'),
        read: () => state().propellant,
      },
      { id: 'pumps', set: () => state().setEngine('merlin'), read: () => state().engine },
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

  it('pauses the nozzle chapter at liftoff and resumes in the next chapter', () => {
    const store = createRaptorStore({ phase: 80, playing: true });
    store.getState().applyPreset('nozzle');
    expect(store.getState()).toMatchObject({ phase: 3, playing: false, pausedByPreset: true });
    store.getState().applyPreset('ascent');
    expect(store.getState()).toMatchObject({ phase: 3, playing: true, speed: 4 });
    expect(store.getState().view).toMatchObject({ cutaway: false, cluster: true });
  });

  it('starts the burn again for the pumps chapter in slow motion', () => {
    const store = createRaptorStore({ phase: 90, playing: true });
    store.getState().applyPreset('pumps');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true, speed: 0 });
    expect(store.getState().view).toMatchObject({ cutaway: true, flow: true });
  });

  it('keeps the labels through the chapters', () => {
    const store = createRaptorStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});
