import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createWatchStore } from '../state';
import { bindStore } from './bindings';
import type { WatchController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const followWheel = vi.fn();
  const setHighlight = vi.fn();
  const watch = { build: record, setState: record, followWheel, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    followWheel,
    setHighlight,
    targets: {
      watch: watch as unknown as WatchController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the movement fully wound and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createWatchStore({ phase: 30 }), targets);
    expect(received[0]).toMatchObject({
      phase: 30,
      cycles: 0,
      reserve: 42,
      regulator: 0,
      view: { dial: true, bridges: true },
    });
    expect(received[0].amplitude).toBeCloseTo(280);
    expect(frame).toHaveBeenCalledWith('movement', false, undefined);
  });

  it('passes the swing count as the loop wraps', () => {
    const { received, targets } = fakeTargets();
    const store = createWatchStore({ phase: 350, speed: 0, playing: true });
    bindStore(store, targets);
    store.getState().tick(0.01);
    expect(received.at(-1)).toMatchObject({ cycles: 1 });
    expect(received.at(-1)?.phase).toBeCloseTo(4.4);
  });

  it('lowers the amplitude as the reserve runs down', () => {
    const { received, targets } = fakeTargets();
    const store = createWatchStore();
    bindStore(store, targets);
    store.getState().setReserve(0);
    store.getState().setRegulator(0.5);
    expect(received.at(-1)).toMatchObject({ reserve: 0, regulator: 0.5 });
    expect(received.at(-1)?.amplitude).toBeCloseTo(186.3, 1);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createWatchStore();
    bindStore(store, targets);
    store.getState().setPhase(100);
    store.getState().setPhase(200);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the balance chapter with the swing already back at its start', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createWatchStore({ phase: 200 });
    bindStore(store, targets);
    store.getState().applyPreset('balance');
    expect(frame).toHaveBeenLastCalledWith('balance', true, undefined);
    expect(received.at(-1)?.phase).toBe(0);
  });

  it('follows and highlights the wheel the reader picks in the train chapter', () => {
    const { followWheel, setHighlight, frame, targets } = fakeTargets();
    const store = createWatchStore();
    bindStore(store, targets);
    expect(followWheel).toHaveBeenCalledWith('centreWheel');
    store.getState().applyPreset('train');
    expect(setHighlight).toHaveBeenLastCalledWith(['centreWheel']);
    store.getState().setWheel('escapeWheel');
    store.getState().resetCamera();
    expect(followWheel).toHaveBeenLastCalledWith('escapeWheel');
    expect(setHighlight).toHaveBeenLastCalledWith(['escapeWheel']);
    expect(frame).toHaveBeenLastCalledWith('wheel', true, undefined);
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createWatchStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(150);
    expect(received).toHaveLength(calls);
  });
});
