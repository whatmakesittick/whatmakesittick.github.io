import { describe, expect, it } from 'vitest';
import { RUN_UNITS, rate } from '../model';
import { PRESETS } from './presets';
import { DEFAULT_VIEW, START_PHASE, START_VIEW, createEuvStore } from './store';

describe('euv store', () => {
  it('starts on the machine chapter, playing from the droplet on the first machine', () => {
    const state = createEuvStore().getState();
    expect(state.preset).toBe('machine');
    expect(state.phase).toBe(START_PHASE);
    expect(START_PHASE).toBe(0);
    expect(state.playing).toBe(true);
    expect(state.machine).toBe('nxe3600d');
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.machine.view });
  });

  it('sets the machine', () => {
    const store = createEuvStore();
    store.getState().setMachine('exe5000');
    expect(store.getState().machine).toBe('exe5000');
  });

  it('keeps the machine when the chapter changes', () => {
    const store = createEuvStore();
    store.getState().setMachine('nxe3800e');
    store.getState().applyPreset('scan');
    expect(store.getState()).toMatchObject({ machine: 'nxe3800e', preset: 'scan' });
  });

  it('applies the chapter speed, seek and pause', () => {
    const store = createEuvStore();
    store.getState().applyPreset('mask');
    expect(store.getState()).toMatchObject({ speed: 1, phase: 600, playing: true });
    store.getState().applyPreset('mirrors');
    expect(store.getState()).toMatchObject({ phase: PRESETS.mirrors.pauseAt, playing: false });
  });

  it('plays the run once and stops at the end', () => {
    const store = createEuvStore({ phase: 0, playing: true, speed: 2 });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(rate(2), 9);
    store.getState().tick(1000);
    expect(store.getState()).toMatchObject({ phase: RUN_UNITS, playing: false });
  });
});
