import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createRaptorStore } from '../state';
import { bindStore } from './bindings';
import type { RaptorController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const setHighlight = vi.fn();
  const raptor = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    setHighlight,
    targets: {
      raptor: raptor as unknown as RaptorController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the engine at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createRaptorStore({ phase: 40 }), targets);
    expect(received[0]).toEqual({
      phase: 40,
      propellant: null,
      playing: true,
      view: { cutaway: false, flow: false, flame: true, cluster: false, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('hero', false, undefined);
  });

  it('passes every change of the moment, the propellant and the view to the scene', () => {
    const { received, targets } = fakeTargets();
    const store = createRaptorStore();
    bindStore(store, targets);
    store.getState().setPhase(90);
    expect(received.at(-1)?.phase).toBe(90);
    store.getState().applyPreset('propellants');
    store.getState().setPropellant('oxygen');
    expect(received.at(-1)).toMatchObject({ propellant: 'oxygen', view: { cutaway: true } });
    store.getState().applyPreset('chamber');
    expect(received.at(-1)?.propellant).toBeNull();
    store.getState().toggleView('cluster');
    expect(received.at(-1)?.view.cluster).toBe(true);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createRaptorStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(20);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the nozzle chapter with the flight already at liftoff', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createRaptorStore({ phase: 100 });
    bindStore(store, targets);
    store.getState().applyPreset('nozzle');
    expect(frame).toHaveBeenLastCalledWith('nozzle', true, undefined);
    expect(received.at(-1)?.phase).toBe(3);
  });

  it('highlights the route of the propellant the reader picks', () => {
    const { setHighlight, targets } = fakeTargets();
    const store = createRaptorStore();
    bindStore(store, targets);
    store.getState().applyPreset('propellants');
    expect(setHighlight).toHaveBeenLastCalledWith(expect.arrayContaining(['liquidMethane']));
    store.getState().setPropellant('oxygen');
    expect(setHighlight).toHaveBeenLastCalledWith([
      'oxygenInlet',
      'oxygenPump',
      'oxygenPreburner',
      'liquidOxygen',
    ]);
    store.getState().applyPreset('nozzle');
    expect(setHighlight).toHaveBeenLastCalledWith(['throat', 'nozzle', 'plume', 'shockDiamonds']);
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createRaptorStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
