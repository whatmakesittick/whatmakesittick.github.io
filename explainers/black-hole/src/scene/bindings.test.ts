import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { HORIZON_TIME, tauAtRadius } from '../model';
import { createBlackHoleStore } from '../state';
import { bindStore } from './bindings';
import type { BlackHoleController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const setHighlight = vi.fn();
  const setWanted = vi.fn();
  const blackHole = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    setHighlight,
    setWanted,
    targets: {
      blackHole: blackHole as unknown as BlackHoleController,
      labelVisibility: { setWanted },
      highlighter: { setHighlight },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the system at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createBlackHoleStore({ phase: 40 }), targets);
    expect(received[0]).toEqual({
      phase: 40,
      playing: true,
      view: { disc: true, sheet: false, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('hero', false, undefined);
  });

  it('passes every change of the moment and the view to the scene', () => {
    const { received, targets } = fakeTargets();
    const store = createBlackHoleStore();
    bindStore(store, targets);
    store.getState().setPhase(90);
    expect(received.at(-1)?.phase).toBe(90);
    store.getState().applyPreset('others');
    expect(received.at(-1)?.view).toMatchObject({ disc: false, sheet: true });
    store.getState().toggleView('disc');
    expect(received.at(-1)?.view.disc).toBe(true);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createBlackHoleStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(20);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames each chapter with the fall already at its moment', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createBlackHoleStore({ phase: 100 });
    bindStore(store, targets);
    store.getState().applyPreset('frozen');
    expect(frame).toHaveBeenLastCalledWith('ship', true, undefined);
    expect(received.at(-1)?.phase).toBeCloseTo(tauAtRadius(2));
    store.getState().applyPreset('inside');
    expect(frame).toHaveBeenLastCalledWith('probe', true, undefined);
    expect(received.at(-1)?.phase).toBeCloseTo(HORIZON_TIME - 8);
  });

  it('highlights and pins the parts of each chapter', () => {
    const { setHighlight, setWanted, targets } = fakeTargets();
    const store = createBlackHoleStore();
    bindStore(store, targets);
    expect(setHighlight).toHaveBeenLastCalledWith([]);
    store.getState().applyPreset('clocks');
    expect(setHighlight).toHaveBeenLastCalledWith(['probe', 'ship', 'beacon']);
    expect(setWanted).toHaveBeenLastCalledWith(
      new Set(['probe', 'ship', 'beacon']),
      new Set(['probe', 'ship', 'beacon']),
    );
    store.getState().toggleView('labels');
    expect(setWanted).toHaveBeenLastCalledWith(new Set(), new Set());
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createBlackHoleStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
