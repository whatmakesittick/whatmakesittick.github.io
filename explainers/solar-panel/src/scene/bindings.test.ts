import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { SUN_MOMENTS } from '../model';
import { createSolarPanelStore } from '../state';
import { bindStore } from './bindings';
import type { SolarPanelController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const setHighlight = vi.fn();
  const solarPanel = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    setHighlight,
    targets: {
      solarPanel: solarPanel as unknown as SolarPanelController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the roof at the store time and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createSolarPanelStore({ phase: SUN_MOMENTS.noon }), targets);
    expect(received[0]).toMatchObject({
      minute: 720,
      tilt: 35,
      explode: 0,
      wavelength: 600,
      shade: 0,
      layout: 'halfCut',
      deadStrings: [false, false, false, false, false, false],
      activeDiodes: [false, false, false],
      view: { sun: true, slice: false, flow: true, labels: false },
    });
    expect(received[0].irradiance).toBeCloseTo(973, -1);
    expect(received[0].power).toBeCloseTo(375, -0.5);
    expect(received[0].cellTemperature).toBeCloseTo(53.8, 0);
    expect(frame).toHaveBeenCalledWith('roof', false, undefined);
  });

  it('passes the shaded power and the dead strings to the scene', () => {
    const { received, targets } = fakeTargets();
    const store = createSolarPanelStore({ phase: SUN_MOMENTS.noon });
    bindStore(store, targets);
    store.getState().setShade(0.35);
    expect(received.at(-1)?.deadStrings).toEqual([false, true, false, true, false, true]);
    expect(received.at(-1)?.power).toBeLessThan(200);
    store.getState().setTemperature(70);
    expect(received.at(-1)?.cellTemperature).toBe(70);
  });

  it('shows a dark panel before sunrise', () => {
    const { received, targets } = fakeTargets();
    bindStore(createSolarPanelStore({ phase: 20 }), targets);
    expect(received[0]).toMatchObject({ irradiance: 0, power: 0 });
    expect(received[0].deadStrings.every(Boolean)).toBe(true);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createSolarPanelStore();
    bindStore(store, targets);
    store.getState().setPhase(100);
    store.getState().setPhase(200);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the junction chapter with the clock already at noon', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createSolarPanelStore({ phase: 100 });
    bindStore(store, targets);
    store.getState().applyPreset('junction');
    expect(frame).toHaveBeenLastCalledWith('cell', true, undefined);
    expect(received.at(-1)).toMatchObject({ minute: 720, view: { slice: true } });
  });

  it('highlights the layer the reader picks in the layers chapter', () => {
    const { setHighlight, targets } = fakeTargets();
    const store = createSolarPanelStore();
    bindStore(store, targets);
    store.getState().applyPreset('layers');
    expect(setHighlight).toHaveBeenLastCalledWith(['glass']);
    store.getState().setLayer('backsheet');
    expect(setHighlight).toHaveBeenLastCalledWith(['backsheet']);
    store.getState().applyPreset('wiring');
    expect(setHighlight).toHaveBeenLastCalledWith(expect.arrayContaining(['cell', 'bypassDiode']));
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createSolarPanelStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(150);
    expect(received).toHaveLength(calls);
  });
});
