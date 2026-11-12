import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createWindFarmStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 0.4;
const STRONG_WIND_MS = 15;

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push(structuredClone(state));
  };
  const frame = vi.fn();
  const setWanted = vi.fn();
  const targets: SceneTargets = {
    windFarm: { build: async (state) => record(state), setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, targets };
}

describe('wind farm scene bindings', () => {
  it('builds the scene from the store and frames the first chapter', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createWindFarmStore();
    await bindStore(store, targets);
    const { phase, spacing, view } = store.getState();
    expect(received[0]).toMatchObject({ scene: 'farm', phase, view, farm: { spacing } });
    expect(frame).toHaveBeenCalledWith('farmAerial', false, undefined);
  });

  it('swaps the scene and hands over the view flags before framing the next camera', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createWindFarmStore();
    await bindStore(store, targets);
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('nacelle');
    expect(frame).toHaveBeenLastCalledWith('nacelleCutaway', true, undefined);
    expect(handedBeforeFrame).toMatchObject({ scene: 'turbine', view: { cutaway: true } });
  });

  it('applies a view toggle at once and refreshes the labels', async () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createWindFarmStore();
    await bindStore(store, targets);
    const before = setWanted.mock.calls.length;
    const shown = store.getState().view.cables;
    store.getState().toggleView('cables');
    expect(received.at(-1)?.view.cables).toBe(!shown);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('alternates two buffers so the held state is never rewritten', async () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createWindFarmStore();
    await bindStore(store, targets);
    store.getState().pause();
    store.getState().setPhase(LATER_PHASE);
    store.getState().setWindOverride(STRONG_WIND_MS);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.wind.speed).toBe(STRONG_WIND_MS);
  });

  it('stops handing over states once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createWindFarmStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
