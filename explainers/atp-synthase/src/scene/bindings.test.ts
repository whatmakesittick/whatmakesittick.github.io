import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createAtpSynthaseStore } from '../state';
import { bindStore } from './bindings';
import type { AtpSynthaseController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const setHighlight = vi.fn();
  const show = vi.fn();
  const synthase = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    setHighlight,
    targets: {
      synthase: synthase as unknown as AtpSynthaseController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight },
      labels: { show },
    },
  };
}

describe('scene bindings', () => {
  it('builds one human motor at the store angle and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createAtpSynthaseStore({ phase: 30, playing: false }), targets);
    expect(received[0]).toEqual({
      rotorDeg: 30,
      laps: 0,
      degreesPerSecond: 0,
      bladeCount: 8,
      motorCount: 1,
      view: { membrane: true, cutaway: false, flow: true, labels: false },
    });
    expect(frame).toHaveBeenCalledWith('motor', false, undefined);
  });

  it('passes the playback rate while playing and stops it when paused', () => {
    const { received, targets } = fakeTargets();
    const store = createAtpSynthaseStore({ playing: true, speed: 10 });
    bindStore(store, targets);
    expect(received.at(-1)?.degreesPerSecond).toBeCloseTo(36_000);
    store.getState().setSpeed(0);
    expect(received.at(-1)?.degreesPerSecond).toBeCloseTo(36_000 / 1024);
    store.getState().pause();
    expect(received.at(-1)?.degreesPerSecond).toBe(0);
  });

  it('passes the lap count as the rotor passes 0°', () => {
    const { received, targets } = fakeTargets();
    const store = createAtpSynthaseStore({ phase: 350, speed: 4, playing: true });
    bindStore(store, targets);
    store.getState().tick(0.1);
    expect(received.at(-1)).toMatchObject({ laps: 1 });
    expect(received.at(-1)?.rotorDeg).toBeCloseTo(46.25);
  });

  it('rebuilds the ring with the blade count of the picked ring', () => {
    const { received, targets } = fakeTargets();
    const store = createAtpSynthaseStore();
    bindStore(store, targets);
    store.getState().applyPreset('rotor');
    store.getState().setRing('chloroplast');
    expect(received.at(-1)?.bladeCount).toBe(14);
    expect(received.at(-1)?.view.membrane).toBe(false);
  });

  it('frames the training row with the motors already shown', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createAtpSynthaseStore();
    store.getState().setTraining('years');
    bindStore(store, targets);
    frame.mockImplementation(() => expect(received.at(-1)?.motorCount).toBe(10));
    store.getState().applyPreset('training');
    expect(frame).toHaveBeenLastCalledWith('row', true, undefined);
    expect(received.at(-1)?.motorCount).toBe(10);
  });

  it('highlights and labels each chapter', () => {
    const { setHighlight, targets } = fakeTargets();
    const store = createAtpSynthaseStore();
    bindStore(store, targets);
    store.getState().applyPreset('rotor');
    expect(setHighlight).toHaveBeenLastCalledWith(['cRing', 'subunitA', 'protons']);
    expect(targets.labelVisibility.setWanted).toHaveBeenLastCalledWith(new Set(), new Set());
    store.getState().toggleView('labels');
    const [wanted, pinned] = targets.labelVisibility.setWanted.mock.lastCall ?? [];
    expect(pinned).toEqual(
      new Set(['cRing', 'subunitA', 'protons', 'matrix', 'intermembraneSpace']),
    );
    expect(wanted?.size).toBeGreaterThan(pinned?.size ?? 0);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createAtpSynthaseStore();
    bindStore(store, targets);
    store.getState().setPhase(100);
    store.getState().setPhase(200);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createAtpSynthaseStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(150);
    expect(received).toHaveLength(calls);
  });
});
