import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createOilRigStore } from '../state';
import { bindStore } from './bindings';
import type { OilRigController } from './controller';

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push({ ...state });
  };
  const frame = vi.fn();
  const oilRig = {
    build: async (state: AssemblyState) => record(state),
    setState: record,
    views: { frame },
  };
  return {
    received,
    snapshots,
    frame,
    targets: {
      oilRig: oilRig as unknown as OilRigController,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
    },
  };
}

describe('scene bindings', () => {
  it('builds the assembly with the planned mud and frames the first chapter', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createOilRigStore({ phase: 3000 });
    await bindStore(store, targets);
    expect(received[0]).toMatchObject({
      bitDepth: 3000,
      mudWeight: 1.2,
      mudState: 'safe',
      bit: 'pdc',
    });
    expect(frame).toHaveBeenCalledWith('overview', false, undefined);
  });

  it('passes the effective mud weight and its state on every change', async () => {
    const { received, targets } = fakeTargets();
    const store = createOilRigStore();
    await bindStore(store, targets);
    store.getState().setPhase(4100);
    store.getState().setMudWeight(1.1);
    expect(received.at(-1)).toMatchObject({ bitDepth: 4100, mudWeight: 1.1, mudState: 'light' });
    store.getState().setMudWeight(null);
    expect(received.at(-1)).toMatchObject({ mudWeight: 1.4, mudState: 'safe' });
  });

  it('never changes the state object the assembly got last', async () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createOilRigStore();
    await bindStore(store, targets);
    store.getState().setPhase(1000);
    store.getState().setPhase(2000);
    const last = received.length - 1;
    expect(received[last]).not.toBe(received[last - 1]);
    expect(received[last - 1]).toEqual(snapshots[last - 1]);
  });

  it('frames the next chapter with the bit already moved', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createOilRigStore();
    await bindStore(store, targets);
    store.getState().applyPreset('drill');
    expect(frame).toHaveBeenLastCalledWith('bit', true, undefined);
    expect(received.at(-1)?.bitDepth).toBe(2025);
  });

  it('stops listening once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createOilRigStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const calls = received.length;
    store.getState().setPhase(1500);
    expect(received).toHaveLength(calls);
  });
});
