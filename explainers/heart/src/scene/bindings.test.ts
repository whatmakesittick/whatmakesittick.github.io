import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createHeartStore } from '../state';
import { bindStore } from './bindings';
import type { HeartController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const setHighlight = vi.fn();
  const heart = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    setHighlight,
    targets: {
      heart: heart as unknown as HeartController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the heart at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createHeartStore({ phase: 320 }), targets);
    expect(received[0]).toEqual({
      time: 320,
      chamber: 'leftVentricle',
      valve: 'mitral',
      view: { cutaway: false, flow: true, conduction: false, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('front', false, undefined);
  });

  it('passes every change of the moment, the picks and the view to the scene', () => {
    const { received, targets } = fakeTargets();
    const store = createHeartStore();
    bindStore(store, targets);
    store.getState().setPhase(500);
    expect(received.at(-1)?.time).toBe(500);
    store.getState().applyPreset('chambers');
    store.getState().setChamber('rightAtrium');
    expect(received.at(-1)).toMatchObject({ chamber: 'rightAtrium', view: { cutaway: true } });
    store.getState().toggleView('conduction');
    expect(received.at(-1)?.view.conduction).toBe(true);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createHeartStore();
    bindStore(store, targets);
    store.getState().setPhase(100);
    store.getState().setPhase(200);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the cycle chapter with the beat already back at its start', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createHeartStore({ phase: 400 });
    bindStore(store, targets);
    store.getState().applyPreset('cycle');
    expect(frame).toHaveBeenLastCalledWith('left', true, undefined);
    expect(received.at(-1)?.time).toBe(0);
  });

  it('highlights the chamber the reader picks in the chambers chapter', () => {
    const { setHighlight, targets } = fakeTargets();
    const store = createHeartStore();
    bindStore(store, targets);
    store.getState().applyPreset('chambers');
    expect(setHighlight).toHaveBeenLastCalledWith(['leftVentricle']);
    store.getState().setChamber('leftAtrium');
    expect(setHighlight).toHaveBeenLastCalledWith(['leftAtrium']);
    store.getState().applyPreset('conduction');
    expect(setHighlight).toHaveBeenLastCalledWith(
      expect.arrayContaining(['sinusNode', 'purkinjeFibres']),
    );
  });

  it('highlights the picked valve and follows it with the camera in the valves chapter', () => {
    const { setHighlight, frame, targets } = fakeTargets();
    const store = createHeartStore();
    bindStore(store, targets);
    store.getState().applyPreset('valves');
    expect(frame).toHaveBeenLastCalledWith('valve', true, undefined);
    expect(setHighlight).toHaveBeenLastCalledWith(['mitralValve', 'chordae']);
    frame.mockClear();
    store.getState().setValve('aortic');
    expect(setHighlight).toHaveBeenLastCalledWith(['aorticValve']);
    expect(frame).toHaveBeenCalledWith('valve', true);
  });

  it('leaves the camera alone when a valve changes outside the valves chapter', () => {
    const { frame, targets } = fakeTargets();
    const store = createHeartStore();
    bindStore(store, targets);
    store.getState().applyPreset('valves');
    store.getState().setValve('pulmonary');
    frame.mockClear();
    store.getState().applyPreset('cycle');
    expect(store.getState().valve).toBe('mitral');
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenCalledWith('left', true, undefined);
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createHeartStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(150);
    expect(received).toHaveLength(calls);
  });
});
