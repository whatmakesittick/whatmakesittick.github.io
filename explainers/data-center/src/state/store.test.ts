import { describe, expect, it } from 'vitest';
import { RUN_UNITS, rate } from '../model';
import { PRESETS } from './presets';
import {
  CHAPTER_CONTROL_DEFAULTS,
  DEFAULT_VIEW,
  START_PHASE,
  START_VIEW,
  createDataCenterStore,
} from './store';

describe('data center store', () => {
  it('starts on the building chapter, playing from the grid with a liquid rack at full load', () => {
    const state = createDataCenterStore().getState();
    expect(state.preset).toBe('building');
    expect(START_PHASE).toBe(0);
    expect(state.phase).toBe(START_PHASE);
    expect(state.playing).toBe(true);
    expect(state.pausedByPreset).toBe(false);
    expect(state.speed).toBe(4);
    expect(state.cooling).toBe('liquid');
    expect(state.load).toBe('full');
    expect(state.outageToken).toBe(0);
    expect(state).toMatchObject(CHAPTER_CONTROL_DEFAULTS);
    expect(state.view).toEqual(START_VIEW);
    expect(START_VIEW).toEqual({ ...DEFAULT_VIEW, ...PRESETS.building.view });
  });

  it('keeps the industry average and a user 1,000 km away as chapter defaults', () => {
    expect(CHAPTER_CONTROL_DEFAULTS).toEqual({ benchmark: 'average', distance: 'km1000' });
    expect(DEFAULT_VIEW.labels).toBe(true);
    expect(DEFAULT_VIEW.follow).toBe(false);
  });

  it('sets the cooling, the load, the benchmark and the distance', () => {
    const store = createDataCenterStore();
    store.getState().setCooling('air');
    store.getState().setLoad('idle');
    store.getState().setBenchmark('best');
    store.getState().setDistance('km100');
    expect(store.getState()).toMatchObject({
      cooling: 'air',
      load: 'idle',
      benchmark: 'best',
      distance: 'km100',
    });
  });

  it('counts every grid cut so the same drill can restart', () => {
    const store = createDataCenterStore();
    store.getState().cutGrid();
    expect(store.getState().outageToken).toBe(1);
    store.getState().cutGrid();
    expect(store.getState().outageToken).toBe(2);
  });

  it('resets the chapter controls on a chapter change and keeps the cooling, load and drill', () => {
    const store = createDataCenterStore();
    const state = store.getState();
    state.setCooling('air');
    state.setLoad('idle');
    state.setBenchmark('best');
    state.setDistance('km100');
    state.cutGrid();
    state.applyPreset('rack');
    expect(store.getState()).toMatchObject({
      ...CHAPTER_CONTROL_DEFAULTS,
      cooling: 'air',
      load: 'idle',
      outageToken: 1,
      preset: 'rack',
    });
  });

  it('applies the chapter start over the defaults', () => {
    const store = createDataCenterStore();
    store.getState().setDistance('km100');
    store.getState().applyPreset('network');
    expect(store.getState().distance).toBe('km1000');
    store.getState().setBenchmark('best');
    store.getState().applyPreset('compare');
    expect(store.getState().benchmark).toBe('average');
  });

  it('keeps the chapter controls when the same chapter is applied again', () => {
    const store = createDataCenterStore();
    store.getState().setBenchmark('best');
    store.getState().setDistance('km100');
    store.getState().applyPreset('building');
    expect(store.getState()).toMatchObject({ benchmark: 'best', distance: 'km100' });
  });

  it('applies each chapter view, speed and seek, and leaves the labels and follow as the reader left them', () => {
    const store = createDataCenterStore();
    store.getState().toggleView('labels');
    store.getState().toggleView('follow');
    store.getState().applyPreset('rack');
    expect(store.getState()).toMatchObject({ speed: 2, phase: 420, playing: true });
    expect(store.getState().view).toEqual({ ...PRESETS.rack.view, labels: false, follow: true });
    store.getState().applyPreset('network');
    expect(store.getState()).toMatchObject({ speed: 4, phase: 450, playing: false });
    expect(store.getState().view).toEqual({
      ...PRESETS.network.view,
      labels: false,
      follow: true,
    });
  });

  it('plays the run once and stops in the air above the roof', () => {
    const store = createDataCenterStore({ phase: 0, playing: true, speed: 4 });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(rate(4), 9);
    store.getState().tick(60);
    expect(store.getState()).toMatchObject({ phase: RUN_UNITS, playing: false });
    store.getState().play();
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });

  it('keeps the playback speed inside its range', () => {
    const store = createDataCenterStore();
    store.getState().setSpeed(100);
    expect(store.getState().speed).toBe(16);
    store.getState().setSpeed(0);
    expect(store.getState().speed).toBe(1);
  });
});
