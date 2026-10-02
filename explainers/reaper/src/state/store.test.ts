import { describe, expect, it } from 'vitest';
import { MOMENT_IDS, PRESET_IDS } from '../ids';
import { MISSION_UNITS, MOMENTS } from '../model';
import { PRESETS } from './presets';
import { DEFAULT_VIEW, createReaperStore } from './store';

describe('reaper store', () => {
  it('starts armed on the overview at the start of the run with the chapter defaults', () => {
    expect(createReaperStore().getState()).toMatchObject({
      phase: 0,
      speed: 1,
      preset: 'overview',
      load: 'armed',
      comparison: 'predator',
      sensorMode: 'day',
      targetRange: 8,
      areaDistance: 400,
      view: { cutaway: false, links: true, track: true, labels: true },
    });
  });

  it('opens with the view the overview chapter asks for', () => {
    expect(DEFAULT_VIEW).toMatchObject(PRESETS.overview.view ?? {});
  });

  it('flies the whole mission in 90 s and stops at the end', () => {
    const store = createReaperStore({ phase: 0, playing: true });
    store.getState().tick(45);
    expect(store.getState().phase).toBeCloseTo(MISSION_UNITS / 2, 9);
    store.getState().tick(60);
    expect(store.getState().phase).toBe(MISSION_UNITS);
    expect(store.getState().playing).toBe(false);
  });

  it('pauses at each moment', () => {
    const store = createReaperStore({ playing: true });
    MOMENT_IDS.forEach((moment) => {
      store.getState().play();
      store.getState().seekMoment(moment);
      expect(store.getState().playing, moment).toBe(false);
      expect(store.getState().phase, moment).toBeCloseTo(MOMENTS[moment], 9);
    });
  });

  it('keeps the target range and the area distance inside their sliders', () => {
    const store = createReaperStore();
    store.getState().setTargetRange(12);
    expect(store.getState().targetRange).toBe(11);
    store.getState().setTargetRange(2);
    expect(store.getState().targetRange).toBe(8);
    store.getState().setAreaDistance(5000);
    expect(store.getState().areaDistance).toBe(2000);
    store.getState().setAreaDistance(10);
    expect(store.getState().areaDistance).toBe(100);
  });

  it.each([
    ['flight', 'comparison', 'cessna', 'predator'],
    ['sensor', 'sensorMode', 'infrared', 'day'],
    ['strike', 'targetRange', 10, 8],
    ['endurance', 'areaDistance', 1200, 400],
  ] as const)(
    'keeps the %s chapter control and resets it elsewhere',
    (chapter, field, value, reset) => {
      const store = createReaperStore();
      PRESET_IDS.forEach((id) => {
        store.getState().applyPreset(chapter);
        store.setState({ [field]: value });
        store.getState().applyPreset(id);
        expect(store.getState()[field], id).toBe(id === chapter ? value : reset);
      });
    },
  );

  it('keeps the load through every chapter but arms the aircraft for the strike', () => {
    const store = createReaperStore();
    PRESET_IDS.forEach((id) => {
      store.getState().setLoad('clean');
      store.getState().applyPreset(id);
      expect(store.getState().load, id).toBe(id === 'strike' ? 'armed' : 'clean');
    });
  });

  it('lets the reader unload the aircraft once the strike chapter is open', () => {
    const store = createReaperStore();
    store.getState().applyPreset('strike');
    store.getState().setLoad('clean');
    expect(store.getState().load).toBe('clean');
  });

  it('seeks each chapter without stopping playback at normal speed', () => {
    const store = createReaperStore({ phase: 80, playing: true });
    store.getState().applyPreset('strike');
    expect(store.getState()).toMatchObject({ phase: 61.5, playing: true, speed: 1 });
    store.getState().setSpeed(2);
    store.getState().applyPreset('endurance');
    expect(store.getState()).toMatchObject({ phase: 46, playing: true, speed: 1 });
  });

  it('keeps the labels through the chapters', () => {
    const store = createReaperStore();
    PRESET_IDS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});
