import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { PRESETS, createSwimStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 300;

function fakeTargets() {
  const received: AssemblyState[] = [];
  const snapshots: AssemblyState[] = [];
  const record = (state: AssemblyState) => {
    received.push(state);
    snapshots.push(structuredClone(state));
  };
  const build = async (state: AssemblyState) => record(state);
  const frame = vi.fn();
  const setWanted = vi.fn();
  const setHighlight = vi.fn();
  const targets: SceneTargets = {
    swim: { build, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, setHighlight, targets };
}

describe('swim scene bindings', () => {
  it('builds the scene from the store and frames the first chapter', async () => {
    const { received, frame, targets } = fakeTargets();
    const store = createSwimStore();
    await bindStore(store, targets);
    expect(received[0]?.phase).toBe(store.getState().phase);
    expect(frame).toHaveBeenCalledWith('whole', false, undefined);
  });

  it('frames the next chapter and dims all but its parts', async () => {
    const { frame, setHighlight, targets } = fakeTargets();
    const store = createSwimStore();
    await bindStore(store, targets);
    store.getState().applyPreset('catch');
    expect(frame).toHaveBeenLastCalledWith('catch', true, undefined);
    expect(setHighlight).toHaveBeenLastCalledWith(PRESETS.catch.highlight);
  });

  it('copies the store view flags into the assembly state', async () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createSwimStore();
    await bindStore(store, targets);
    store.getState().applyPreset('pull');
    expect(received.at(-1)?.view).toMatchObject({ forces: true, handPath: true });
    store.getState().toggleView('forces');
    expect(received.at(-1)?.view.forces).toBe(false);
    store.getState().toggleView('labels');
    expect(setWanted.mock.lastCall?.[0].size).toBe(0);
  });

  it('alternates two buffers so the held state is never rewritten', async () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createSwimStore();
    await bindStore(store, targets);
    store.getState().pause();
    store.getState().setPhase(100);
    store.getState().setPhase(LATER_PHASE);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.phase).toBe(LATER_PHASE);
  });

  it('stops handing over states once unbound', async () => {
    const { received, targets } = fakeTargets();
    const store = createSwimStore();
    const unbind = await bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
