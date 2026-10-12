import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { createChainsawStore } from '../state';
import { bindStore } from './bindings';
import type { SceneTargets } from './bindings';

const LATER_PHASE = 120;

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
    chainsaw: { build: record, setState: record, views: { frame } },
    labelVisibility: { setWanted },
    highlighter: { setHighlight: vi.fn() },
    labels: { show: vi.fn() },
  };
  return { received, snapshots, frame, setWanted, targets };
}

describe('chainsaw scene bindings', () => {
  it('builds the saw from the store and frames the first chapter', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createChainsawStore();
    bindStore(store, targets);
    expect(received[0]).toMatchObject({ setting: 'cutting', phase: store.getState().phase });
    expect(frame).toHaveBeenCalledWith('sawSide', false, undefined);
  });

  it('hands over the bench setting and the cutaway before framing the next camera', () => {
    const { received, frame, targets } = fakeTargets();
    const store = createChainsawStore();
    bindStore(store, targets);
    let handedBeforeFrame: AssemblyState | undefined;
    frame.mockImplementationOnce(() => (handedBeforeFrame = received.at(-1)));
    store.getState().applyPreset('engine');
    expect(frame).toHaveBeenLastCalledWith('cylinderCut', true, undefined);
    expect(handedBeforeFrame).toMatchObject({ setting: 'bench', view: { cutaway: true } });
  });

  it('applies a view toggle at once and refreshes the labels', () => {
    const { received, setWanted, targets } = fakeTargets();
    const store = createChainsawStore();
    bindStore(store, targets);
    const before = setWanted.mock.calls.length;
    store.getState().toggleView('zone');
    expect(received.at(-1)?.view.zone).toBe(true);
    expect(setWanted.mock.calls.length).toBeGreaterThan(before);
  });

  it('alternates two buffers so the held state is never rewritten', () => {
    const { received, snapshots, targets } = fakeTargets();
    const store = createChainsawStore();
    bindStore(store, targets);
    store.getState().pause();
    store.getState().setThrottle(0);
    store.getState().setPhase(LATER_PHASE);
    const [first, second, third] = received.slice(-3);
    expect(first).not.toBe(second);
    expect(third).toBe(first);
    expect(received.at(-2)).toEqual(snapshots.at(-2));
    expect(third?.crank.angle).toBe(LATER_PHASE);
  });

  it('stops handing over states once unbound', () => {
    const { received, targets } = fakeTargets();
    const store = createChainsawStore();
    const unbind = bindStore(store, targets);
    unbind();
    const count = received.length;
    store.getState().setPhase(LATER_PHASE);
    expect(received).toHaveLength(count);
  });
});
