import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { REAR_MS, motionAt, msAt, shotAt, unitsAt } from '../model';
import { createRifleStore } from '../state';
import { bindStore } from './bindings';
import type { RifleController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const rifle = { build: record, setState: record, views: { frame } };
  return {
    received,
    snapshots,
    frame,
    targets: {
      rifle: rifle as unknown as RifleController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the rifle at the store moment and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    bindStore(createRifleStore({ phase: 40 }), targets);
    const ms = msAt(40);
    expect(received[0]).toEqual({
      time: ms,
      shot: shotAt(ms, 'open'),
      motion: motionAt(ms, 'open'),
      gasPort: 'open',
      playing: true,
      view: { cutaway: false, gas: true, trail: true, labels: true },
    });
    expect(frame).toHaveBeenCalledWith('hero', false, undefined);
  });

  it('hands the scene the readings for every change of time, port and view', () => {
    const { received, targets } = fakeTargets();
    const store = createRifleStore();
    bindStore(store, targets);
    store.getState().setPhase(unitsAt(REAR_MS));
    expect(received.at(-1)?.time).toBeCloseTo(REAR_MS, 9);
    expect(received.at(-1)?.motion.carrier).toBe(130);
    store.getState().applyPreset('gas');
    store.getState().setGasPort('blocked');
    expect(received.at(-1)).toMatchObject({ gasPort: 'blocked', view: { cutaway: true } });
    store.getState().setPhase(unitsAt(REAR_MS));
    expect(received.at(-1)?.motion.carrier).toBe(0);
    store.getState().toggleView('trail');
    expect(received.at(-1)?.view.trail).toBe(false);
  });

  it('never changes the state object the assembly got last', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createRifleStore();
    bindStore(store, targets);
    store.getState().setPhase(10);
    store.getState().setPhase(20);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the cartridge chapter paused at the strike', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createRifleStore({ phase: 70 });
    bindStore(store, targets);
    store.getState().applyPreset('cartridge');
    expect(frame).toHaveBeenLastCalledWith('cartridge', true, undefined);
    expect(received.at(-1)).toMatchObject({ time: 4, playing: false });
  });

  it('stops listening once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createRifleStore();
    const unbind = bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(50);
    expect(received).toHaveLength(calls);
  });
});
