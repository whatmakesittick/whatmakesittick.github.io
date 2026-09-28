import { describe, expect, it } from 'vitest';
import { PRESETS, presetHighlight } from './presets';
import type { PresetId } from './presets';
import {
  EXPLODE_RANGE,
  SHADE_RANGE,
  TEMPERATURE_RANGE,
  TILT_RANGE,
  WAVELENGTH_RANGE,
} from './ranges';
import { createSolarPanelStore } from './store';

const CHAPTERS: readonly PresetId[] = [
  'overview',
  'sun',
  'layers',
  'junction',
  'wiring',
  'inverter',
];

function othersThan(...kept: PresetId[]): PresetId[] {
  return CHAPTERS.filter((id) => !kept.includes(id));
}

describe('solar panel store', () => {
  it('starts on the overview at 08:30 with the panel at 35° and the sun path on', () => {
    expect(createSolarPanelStore().getState()).toMatchObject({
      phase: 210,
      speed: 16,
      tilt: 35,
      explode: 0,
      layer: 'glass',
      wavelength: 600,
      shade: 0,
      layout: 'halfCut',
      temperature: null,
      view: { sun: true, slice: false, flow: true, labels: false },
    });
  });

  it('plays sixteen minutes of the day every second by default, as the overview asks', () => {
    const store = createSolarPanelStore({ phase: 100, playing: true });
    store.getState().tick(1.5);
    expect(store.getState().phase).toBeCloseTo(124);
  });

  it('jumps from dusk back to dawn', () => {
    const store = createSolarPanelStore({ phase: 835, playing: true });
    store.getState().tick(1);
    expect(store.getState().phase).toBeCloseTo(11);
  });

  it('keeps every slider inside its range', () => {
    const store = createSolarPanelStore();
    const state = () => store.getState();
    state().setTilt(120);
    state().setExplode(-1);
    state().setWavelength(200);
    state().setShade(2);
    state().setTemperature(90);
    expect(state()).toMatchObject({
      tilt: TILT_RANGE.max,
      explode: EXPLODE_RANGE.min,
      wavelength: WAVELENGTH_RANGE.min,
      shade: SHADE_RANGE.max,
      temperature: TEMPERATURE_RANGE.max,
    });
    state().setTemperature(null);
    expect(state().temperature).toBeNull();
  });

  it('picks a layer and a layout', () => {
    const store = createSolarPanelStore();
    store.getState().setLayer('backsheet');
    store.getState().setLayout('fullCell');
    expect(store.getState()).toMatchObject({ layer: 'backsheet', layout: 'fullCell' });
  });

  it('keeps the tilt through every chapter', () => {
    const store = createSolarPanelStore();
    store.getState().setTilt(60);
    CHAPTERS.forEach((id) => {
      store.getState().applyPreset(id);
      expect(store.getState().tilt, id).toBe(60);
    });
  });

  it('spreads the layers when the layers chapter opens and closes them elsewhere', () => {
    const store = createSolarPanelStore();
    store.getState().applyPreset('layers');
    expect(store.getState().explode).toBe(0.6);
    store.getState().setExplode(0.9);
    store.getState().applyPreset('layers');
    expect(store.getState().explode).toBe(0.9);
    othersThan('layers').forEach((id) => {
      store.getState().setExplode(0.9);
      store.getState().applyPreset(id);
      expect(store.getState().explode, id).toBe(0);
    });
  });

  it('keeps each chapter control in its chapter and resets it elsewhere', () => {
    const store = createSolarPanelStore();
    const state = () => store.getState();
    const cases = [
      { id: 'layers', set: () => state().setLayer('frame'), read: () => state().layer },
      { id: 'junction', set: () => state().setWavelength(900), read: () => state().wavelength },
      { id: 'wiring', set: () => state().setShade(0.4), read: () => state().shade },
      { id: 'wiring', set: () => state().setLayout('fullCell'), read: () => state().layout },
      { id: 'inverter', set: () => state().setTemperature(65), read: () => state().temperature },
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

  it('seeks 08:30 for the overview and noon for the junction', () => {
    const store = createSolarPanelStore({ phase: 700, playing: true });
    store.getState().applyPreset('overview');
    expect(store.getState()).toMatchObject({ phase: 210, playing: true, speed: 16 });
    store.getState().applyPreset('junction');
    expect(store.getState()).toMatchObject({ phase: 420, speed: 2 });
    expect(store.getState().view).toMatchObject({ slice: true, flow: true });
  });

  it('hides the magnified cell again after the junction chapter', () => {
    const store = createSolarPanelStore();
    store.getState().applyPreset('junction');
    store.getState().applyPreset('wiring');
    expect(store.getState().view.slice).toBe(false);
  });

  it('keeps the labels through the chapters', () => {
    const store = createSolarPanelStore();
    store.getState().setView({ labels: true });
    CHAPTERS.forEach((id) => store.getState().applyPreset(id));
    expect(store.getState().view.labels).toBe(true);
  });
});

describe('chapter highlight', () => {
  it('highlights the layer the reader picked', () => {
    expect(presetHighlight(PRESETS.layers, 'backsheet')).toEqual(['backsheet']);
  });

  it('keeps the chapter highlight elsewhere', () => {
    expect(presetHighlight(PRESETS.wiring, 'cell')).toBe(PRESETS.wiring.highlight);
    expect(PRESETS.wiring.highlight).toContain('bypassDiode');
    expect(presetHighlight(PRESETS.overview, 'cell')).toEqual([]);
  });
});
